//! Orbit Streaming Payments Contract
//! 
//! This Soroban smart contract enables "pay-as-you-go" subscription payments
//! where funds stream from subscriber to creator in real-time.
//! 
//! Key Features:
//! - Subscriber deposits XLM/USDC for a subscription period
//! - Funds stream to creator at a constant rate per second
//! - Creator can withdraw accrued funds at any time
//! - Subscriber can cancel anytime and receive pro-rated refund
//! - Configurable platform fee deducted from each withdrawal
//! - Auto-renewal support with grace periods
//! - Extend existing streams without cancelling
//! - Creator can terminate problematic subscribers

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror,
    Address, Env, Symbol, Vec,
    token::Client as TokenClient,
};

/// Basis points denominator (10000 = 100%)
const BPS_DENOMINATOR: i128 = 10000;
/// Default platform fee (200 basis points = 2%)
const DEFAULT_PLATFORM_FEE_BPS: i128 = 200;
/// Default grace period (24 hours in seconds)
const DEFAULT_GRACE_PERIOD: u64 = 86400;

/// Errors that can occur in the streaming payments contract
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum StreamError {
    /// Stream not found
    StreamNotFound = 1,
    /// Not authorized to perform this action
    NotAuthorized = 2,
    /// Stream is not active
    StreamNotActive = 3,
    /// Invalid amount (must be positive)
    InvalidAmount = 4,
    /// Invalid duration (must be positive)
    InvalidDuration = 5,
    /// Insufficient balance to withdraw
    InsufficientBalance = 6,
    /// Stream already exists between these parties
    StreamAlreadyExists = 7,
    /// Contract not initialized
    NotInitialized = 8,
    /// Overflow in calculation
    Overflow = 9,
    /// Invalid fee (must be 0-10000 basis points)
    InvalidFee = 10,
    /// Stream is in grace period
    InGracePeriod = 11,
    /// Renewal failed - insufficient funds
    RenewalFailed = 12,
    /// Stream already terminated
    AlreadyTerminated = 13,
}

/// Status of a payment stream
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum StreamStatus {
    /// Stream is actively streaming funds
    Active,
    /// Stream was cancelled by subscriber, refund issued
    Cancelled,
    /// Stream completed its full duration
    Completed,
    /// Stream was terminated by creator
    Terminated,
}

/// A streaming payment from subscriber to creator
#[contracttype]
#[derive(Clone, Debug)]
pub struct Stream {
    /// Unique stream identifier
    pub id: u64,
    /// Subscriber's wallet address (payer)
    pub subscriber: Address,
    /// Creator's wallet address (receiver)
    pub creator: Address,
    /// Token being streamed (XLM native or USDC)
    pub token: Address,
    /// Total amount deposited in the stream
    pub total_amount: i128,
    /// Amount per second being streamed (in stroops)
    pub rate_per_second: i128,
    /// Unix timestamp when stream started
    pub start_time: u64,
    /// Unix timestamp when stream will end
    pub end_time: u64,
    /// Total amount already withdrawn by creator
    pub withdrawn: i128,
    /// Current status of the stream
    pub status: StreamStatus,
    /// Tier ID (for tracking subscription level)
    pub tier_id: u32,
    /// Platform wallet for fee collection
    pub platform_wallet: Address,
    /// Whether auto-renewal is enabled
    pub auto_renew: bool,
    /// Original duration for renewal calculations
    pub duration_seconds: u64,
}

/// Storage keys for contract state
#[contracttype]
pub enum DataKey {
    /// Admin address
    Admin,
    /// Platform wallet for fees
    PlatformWallet,
    /// Platform fee in basis points (configurable)
    PlatformFeeBps,
    /// Grace period in seconds (configurable)
    GracePeriod,
    /// Next stream ID counter
    NextStreamId,
    /// Stream by ID
    Stream(u64),
    /// Streams by subscriber (list of stream IDs)
    SubscriberStreams(Address),
    /// Streams by creator (list of stream IDs)
    CreatorStreams(Address),
    /// Active stream between subscriber and creator
    ActiveStream(Address, Address),
    /// Active subscriber count per creator
    ActiveSubscriberCount(Address),
}

#[contract]
pub struct StreamingPaymentsContract;

#[contractimpl]
impl StreamingPaymentsContract {
    /// Initialize the contract with admin and platform wallet
    /// 
    /// # Arguments
    /// * `admin` - Admin address for contract management
    /// * `platform_wallet` - Wallet to receive platform fees
    /// * `fee_bps` - Platform fee in basis points (e.g., 200 = 2%), max 1000 (10%)
    /// * `grace_period` - Grace period in seconds before stream fully ends
    pub fn initialize(
        env: Env, 
        admin: Address, 
        platform_wallet: Address,
        fee_bps: Option<i128>,
        grace_period: Option<u64>,
    ) {
        // Can only initialize once
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("Already initialized");
        }
        
        admin.require_auth();
        
        // Validate fee (max 10%)
        let fee = fee_bps.unwrap_or(DEFAULT_PLATFORM_FEE_BPS);
        if fee < 0 || fee > 1000 {
            panic!("Fee must be 0-1000 basis points");
        }
        
        let grace = grace_period.unwrap_or(DEFAULT_GRACE_PERIOD);
        
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::PlatformWallet, &platform_wallet);
        env.storage().instance().set(&DataKey::PlatformFeeBps, &fee);
        env.storage().instance().set(&DataKey::GracePeriod, &grace);
        env.storage().instance().set(&DataKey::NextStreamId, &1u64);
    }
    
    /// Create a new streaming payment
    /// 
    /// # Arguments
    /// * `subscriber` - Address of the payer
    /// * `creator` - Address of the receiver
    /// * `token` - Token contract address (use native for XLM)
    /// * `amount` - Total amount to stream
    /// * `duration_seconds` - How long to stream (in seconds)
    /// * `tier_id` - Subscription tier identifier
    /// * `auto_renew` - Whether to enable auto-renewal
    /// 
    /// # Returns
    /// The stream ID
    pub fn create_stream(
        env: Env,
        subscriber: Address,
        creator: Address,
        token: Address,
        amount: i128,
        duration_seconds: u64,
        tier_id: u32,
        auto_renew: bool,
    ) -> Result<u64, StreamError> {
        // Require subscriber authorization
        subscriber.require_auth();
        
        // Validate inputs
        if amount <= 0 {
            return Err(StreamError::InvalidAmount);
        }
        if duration_seconds == 0 {
            return Err(StreamError::InvalidDuration);
        }
        
        // Check if active stream already exists
        let key = DataKey::ActiveStream(subscriber.clone(), creator.clone());
        if env.storage().persistent().has(&key) {
            return Err(StreamError::StreamAlreadyExists);
        }
        
        // Get next stream ID
        let stream_id: u64 = env.storage().instance().get(&DataKey::NextStreamId)
            .ok_or(StreamError::NotInitialized)?;
        
        // Get platform wallet
        let platform_wallet: Address = env.storage().instance().get(&DataKey::PlatformWallet)
            .ok_or(StreamError::NotInitialized)?;
        
        // Calculate rate per second (in stroops for precision)
        let rate_per_second = amount
            .checked_div(duration_seconds as i128)
            .ok_or(StreamError::Overflow)?;
        
        // Current timestamp
        let now = env.ledger().timestamp();
        
        // Create stream
        let stream = Stream {
            id: stream_id,
            subscriber: subscriber.clone(),
            creator: creator.clone(),
            token: token.clone(),
            total_amount: amount,
            rate_per_second,
            start_time: now,
            end_time: now + duration_seconds,
            withdrawn: 0,
            status: StreamStatus::Active,
            tier_id,
            platform_wallet,
            auto_renew,
            duration_seconds,
        };
        
        // Transfer tokens from subscriber to contract
        let token_client = TokenClient::new(&env, &token);
        token_client.transfer(&subscriber, &env.current_contract_address(), &amount);
        
        // Store stream
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        env.storage().persistent().set(&key, &stream_id);
        
        // Update subscriber's stream list
        Self::add_to_address_streams(&env, &subscriber, stream_id, true);
        
        // Update creator's stream list
        Self::add_to_address_streams(&env, &creator, stream_id, false);
        
        // Increment active subscriber count for creator
        Self::increment_subscriber_count(&env, &creator, true);
        
        // Increment stream ID
        env.storage().instance().set(&DataKey::NextStreamId, &(stream_id + 1));
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "stream_created"), subscriber.clone(), creator.clone()),
            (stream_id, amount, duration_seconds),
        );
        
        Ok(stream_id)
    }
    
    /// Get the withdrawable amount for a stream
    /// 
    /// This calculates how much the creator can currently withdraw
    /// based on elapsed time, minus platform fee.
    pub fn get_withdrawable(env: Env, stream_id: u64) -> Result<i128, StreamError> {
        let stream: Stream = env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)?;
        
        if stream.status != StreamStatus::Active {
            return Ok(0);
        }
        
        let now = env.ledger().timestamp();
        let elapsed = if now >= stream.end_time {
            stream.end_time - stream.start_time
        } else {
            now.saturating_sub(stream.start_time)
        };
        
        let earned = stream.rate_per_second
            .checked_mul(elapsed as i128)
            .ok_or(StreamError::Overflow)?;
        
        let withdrawable = earned.saturating_sub(stream.withdrawn);
        
        // Get configurable platform fee
        let fee_bps = Self::get_platform_fee_bps(&env);
        
        // Deduct platform fee
        let fee = withdrawable
            .checked_mul(fee_bps)
            .ok_or(StreamError::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(StreamError::Overflow)?;
        
        Ok(withdrawable.saturating_sub(fee))
    }
    
    /// Creator withdraws accrued funds from a stream
    /// 
    /// # Returns
    /// Amount withdrawn (after platform fee)
    pub fn withdraw(env: Env, stream_id: u64) -> Result<i128, StreamError> {
        let mut stream: Stream = env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)?;
        
        // Only creator can withdraw
        stream.creator.require_auth();
        
        if stream.status != StreamStatus::Active && stream.status != StreamStatus::Completed {
            return Err(StreamError::StreamNotActive);
        }
        
        let now = env.ledger().timestamp();
        let elapsed = if now >= stream.end_time {
            stream.end_time - stream.start_time
        } else {
            now.saturating_sub(stream.start_time)
        };
        
        let earned = stream.rate_per_second
            .checked_mul(elapsed as i128)
            .ok_or(StreamError::Overflow)?;
        
        let withdrawable = earned.saturating_sub(stream.withdrawn);
        
        if withdrawable <= 0 {
            return Err(StreamError::InsufficientBalance);
        }
        
        // Get configurable platform fee
        let fee_bps = Self::get_platform_fee_bps(&env);
        
        // Calculate platform fee
        let fee = withdrawable
            .checked_mul(fee_bps)
            .ok_or(StreamError::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(StreamError::Overflow)?;
        
        let creator_amount = withdrawable.saturating_sub(fee);
        
        // Transfer to creator
        let token_client = TokenClient::new(&env, &stream.token);
        token_client.transfer(&env.current_contract_address(), &stream.creator, &creator_amount);
        
        // Transfer fee to platform
        if fee > 0 {
            token_client.transfer(&env.current_contract_address(), &stream.platform_wallet, &fee);
        }
        
        // Update stream state
        stream.withdrawn = stream.withdrawn.checked_add(withdrawable)
            .ok_or(StreamError::Overflow)?;
        
        // Check if stream is complete
        if now >= stream.end_time {
            stream.status = StreamStatus::Completed;
            // Remove from active streams
            let key = DataKey::ActiveStream(stream.subscriber.clone(), stream.creator.clone());
            env.storage().persistent().remove(&key);
            // Decrement active subscriber count
            Self::increment_subscriber_count(&env, &stream.creator, false);
        }
        
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "withdrawal"), stream.creator.clone()),
            (stream_id, creator_amount, fee),
        );
        
        Ok(creator_amount)
    }
    
    /// Subscriber cancels a stream and receives pro-rated refund
    /// 
    /// # Returns
    /// (creator_received, subscriber_refunded)
    pub fn cancel(env: Env, stream_id: u64) -> Result<(i128, i128), StreamError> {
        let mut stream: Stream = env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)?;
        
        // Only subscriber can cancel
        stream.subscriber.require_auth();
        
        if stream.status != StreamStatus::Active {
            return Err(StreamError::StreamNotActive);
        }
        
        let now = env.ledger().timestamp();
        let elapsed = now.saturating_sub(stream.start_time);
        
        // Calculate what creator has earned
        let earned = stream.rate_per_second
            .checked_mul(elapsed as i128)
            .ok_or(StreamError::Overflow)?;
        
        // Amount not yet withdrawn
        let pending_to_creator = earned.saturating_sub(stream.withdrawn);
        
        // Get configurable platform fee
        let fee_bps = Self::get_platform_fee_bps(&env);
        
        // Calculate fees on pending amount
        let fee = pending_to_creator
            .checked_mul(fee_bps)
            .ok_or(StreamError::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(StreamError::Overflow)?;
        
        let creator_amount = pending_to_creator.saturating_sub(fee);
        
        // Subscriber gets remaining balance
        let subscriber_refund = stream.total_amount
            .saturating_sub(stream.withdrawn)
            .saturating_sub(pending_to_creator);
        
        let token_client = TokenClient::new(&env, &stream.token);
        
        // Pay creator what they earned
        if creator_amount > 0 {
            token_client.transfer(&env.current_contract_address(), &stream.creator, &creator_amount);
        }
        
        // Pay platform fee
        if fee > 0 {
            token_client.transfer(&env.current_contract_address(), &stream.platform_wallet, &fee);
        }
        
        // Refund subscriber
        if subscriber_refund > 0 {
            token_client.transfer(&env.current_contract_address(), &stream.subscriber, &subscriber_refund);
        }
        
        // Update stream status
        stream.status = StreamStatus::Cancelled;
        stream.withdrawn = stream.withdrawn.checked_add(pending_to_creator)
            .ok_or(StreamError::Overflow)?;
        
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        
        // Remove from active streams
        let key = DataKey::ActiveStream(stream.subscriber.clone(), stream.creator.clone());
        env.storage().persistent().remove(&key);
        
        // Decrement active subscriber count
        Self::increment_subscriber_count(&env, &stream.creator, false);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "stream_cancelled"), stream.subscriber.clone()),
            (stream_id, creator_amount, subscriber_refund),
        );
        
        Ok((creator_amount + fee, subscriber_refund))
    }
    
    /// Get stream details
    pub fn get_stream(env: Env, stream_id: u64) -> Result<Stream, StreamError> {
        env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)
    }
    
    /// Get all streams for a subscriber
    pub fn get_subscriber_streams(env: Env, subscriber: Address) -> Vec<u64> {
        let key = DataKey::SubscriberStreams(subscriber);
        env.storage().persistent().get(&key).unwrap_or(Vec::new(&env))
    }
    
    /// Get all streams for a creator
    pub fn get_creator_streams(env: Env, creator: Address) -> Vec<u64> {
        let key = DataKey::CreatorStreams(creator);
        env.storage().persistent().get(&key).unwrap_or(Vec::new(&env))
    }
    
    /// Check if there's an active stream between subscriber and creator
    pub fn has_active_stream(env: Env, subscriber: Address, creator: Address) -> bool {
        let key = DataKey::ActiveStream(subscriber, creator);
        env.storage().persistent().has(&key)
    }
    
    /// Get total accrued earnings for a creator across all active streams
    pub fn get_total_accrued(env: Env, creator: Address) -> i128 {
        let stream_ids = Self::get_creator_streams(env.clone(), creator);
        let mut total: i128 = 0;
        
        for i in 0..stream_ids.len() {
            if let Some(id) = stream_ids.get(i) {
                if let Ok(withdrawable) = Self::get_withdrawable(env.clone(), id) {
                    total = total.saturating_add(withdrawable);
                }
            }
        }
        
        total
    }
    
    /// Helper: Add stream ID to address's stream list
    fn add_to_address_streams(env: &Env, address: &Address, stream_id: u64, is_subscriber: bool) {
        let key = if is_subscriber {
            DataKey::SubscriberStreams(address.clone())
        } else {
            DataKey::CreatorStreams(address.clone())
        };
        
        let mut streams: Vec<u64> = env.storage().persistent().get(&key)
            .unwrap_or(Vec::new(env));
        
        streams.push_back(stream_id);
        env.storage().persistent().set(&key, &streams);
    }
    
    /// Helper: Get platform fee in basis points
    fn get_platform_fee_bps(env: &Env) -> i128 {
        env.storage().instance().get(&DataKey::PlatformFeeBps)
            .unwrap_or(DEFAULT_PLATFORM_FEE_BPS)
    }
    
    /// Helper: Get grace period in seconds
    fn get_grace_period(env: &Env) -> u64 {
        env.storage().instance().get(&DataKey::GracePeriod)
            .unwrap_or(DEFAULT_GRACE_PERIOD)
    }
    
    /// Helper: Increment or decrement active subscriber count for a creator
    fn increment_subscriber_count(env: &Env, creator: &Address, increment: bool) {
        let key = DataKey::ActiveSubscriberCount(creator.clone());
        let current: u64 = env.storage().persistent().get(&key).unwrap_or(0);
        let new_count = if increment {
            current.saturating_add(1)
        } else {
            current.saturating_sub(1)
        };
        env.storage().persistent().set(&key, &new_count);
    }
    
    // === Subscriber Functions ===
    
    /// Extend an existing stream with additional time and funds
    /// 
    /// # Arguments
    /// * `stream_id` - The stream to extend
    /// * `additional_amount` - Additional tokens to deposit
    /// * `additional_seconds` - Additional time to add
    pub fn extend_stream(
        env: Env,
        stream_id: u64,
        additional_amount: i128,
        additional_seconds: u64,
    ) -> Result<(), StreamError> {
        let mut stream: Stream = env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)?;
        
        // Only subscriber can extend
        stream.subscriber.require_auth();
        
        if stream.status != StreamStatus::Active {
            return Err(StreamError::StreamNotActive);
        }
        
        if additional_amount <= 0 {
            return Err(StreamError::InvalidAmount);
        }
        if additional_seconds == 0 {
            return Err(StreamError::InvalidDuration);
        }
        
        // Transfer additional tokens
        let token_client = TokenClient::new(&env, &stream.token);
        token_client.transfer(&stream.subscriber, &env.current_contract_address(), &additional_amount);
        
        // Update stream
        stream.total_amount = stream.total_amount.checked_add(additional_amount)
            .ok_or(StreamError::Overflow)?;
        stream.end_time = stream.end_time + additional_seconds;
        stream.duration_seconds = stream.duration_seconds + additional_seconds;
        
        // Recalculate rate (total remaining / remaining time)
        let now = env.ledger().timestamp();
        let remaining_time = stream.end_time.saturating_sub(now);
        let remaining_amount = stream.total_amount.saturating_sub(stream.withdrawn);
        stream.rate_per_second = remaining_amount
            .checked_div(remaining_time as i128)
            .ok_or(StreamError::Overflow)?;
        
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "stream_extended"), stream.subscriber.clone()),
            (stream_id, additional_amount, additional_seconds),
        );
        
        Ok(())
    }
    
    /// Toggle auto-renewal for a stream
    pub fn toggle_auto_renew(env: Env, stream_id: u64, enabled: bool) -> Result<(), StreamError> {
        let mut stream: Stream = env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)?;
        
        // Only subscriber can toggle
        stream.subscriber.require_auth();
        
        if stream.status != StreamStatus::Active {
            return Err(StreamError::StreamNotActive);
        }
        
        stream.auto_renew = enabled;
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "auto_renew_toggled"), stream.subscriber.clone()),
            (stream_id, enabled),
        );
        
        Ok(())
    }
    
    /// Renew an expired or expiring stream (for auto-renewal)
    /// Can be called by subscriber or any external keeper
    pub fn renew_stream(env: Env, stream_id: u64) -> Result<u64, StreamError> {
        let mut stream: Stream = env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)?;
        
        // Check if stream is eligible for renewal
        let now = env.ledger().timestamp();
        let grace_period = Self::get_grace_period(&env);
        
        // Can only renew if stream has ended or is within grace period
        if stream.status == StreamStatus::Active && now < stream.end_time {
            return Err(StreamError::StreamNotActive);
        }
        
        // Must have auto-renew enabled
        if !stream.auto_renew {
            return Err(StreamError::StreamNotActive);
        }
        
        // Check if within grace period (not too late)
        if now > stream.end_time + grace_period {
            // Grace period expired, mark as completed
            stream.status = StreamStatus::Completed;
            env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
            return Err(StreamError::InGracePeriod);
        }
        
        // Create new stream with same parameters
        let new_stream_id = Self::create_stream(
            env.clone(),
            stream.subscriber.clone(),
            stream.creator.clone(),
            stream.token.clone(),
            stream.total_amount, // Same amount as original
            stream.duration_seconds,
            stream.tier_id,
            true, // Keep auto-renew on
        )?;
        
        // Mark old stream as completed
        stream.status = StreamStatus::Completed;
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        
        // Remove old active stream mapping (create_stream will add new one)
        let key = DataKey::ActiveStream(stream.subscriber.clone(), stream.creator.clone());
        env.storage().persistent().remove(&key);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "stream_renewed"), stream.subscriber.clone()),
            (stream_id, new_stream_id),
        );
        
        Ok(new_stream_id)
    }
    
    // === Creator Functions ===
    
    /// Creator terminates a stream (refunds subscriber for remaining time)
    /// Use this to remove problematic subscribers
    pub fn terminate_stream(env: Env, stream_id: u64) -> Result<i128, StreamError> {
        let mut stream: Stream = env.storage().persistent().get(&DataKey::Stream(stream_id))
            .ok_or(StreamError::StreamNotFound)?;
        
        // Only creator can terminate
        stream.creator.require_auth();
        
        if stream.status != StreamStatus::Active {
            return Err(StreamError::AlreadyTerminated);
        }
        
        let now = env.ledger().timestamp();
        let elapsed = now.saturating_sub(stream.start_time);
        
        // Calculate what creator has earned
        let earned = stream.rate_per_second
            .checked_mul(elapsed as i128)
            .ok_or(StreamError::Overflow)?;
        
        // Creator forfeits pending earnings (no fee taken since creator initiated)
        // Full remaining balance goes back to subscriber
        let subscriber_refund = stream.total_amount.saturating_sub(stream.withdrawn);
        
        let token_client = TokenClient::new(&env, &stream.token);
        
        // Refund entire remaining balance to subscriber
        if subscriber_refund > 0 {
            token_client.transfer(&env.current_contract_address(), &stream.subscriber, &subscriber_refund);
        }
        
        // Update stream status
        stream.status = StreamStatus::Terminated;
        env.storage().persistent().set(&DataKey::Stream(stream_id), &stream);
        
        // Remove from active streams
        let key = DataKey::ActiveStream(stream.subscriber.clone(), stream.creator.clone());
        env.storage().persistent().remove(&key);
        
        // Decrement subscriber count
        Self::increment_subscriber_count(&env, &stream.creator, false);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "stream_terminated"), stream.creator.clone()),
            (stream_id, subscriber_refund),
        );
        
        Ok(subscriber_refund)
    }
    
    /// Creator withdraws from all their active streams at once
    /// 
    /// # Returns
    /// Total amount withdrawn (after fees)
    pub fn withdraw_all(env: Env, creator: Address) -> Result<i128, StreamError> {
        creator.require_auth();
        
        let stream_ids = Self::get_creator_streams(env.clone(), creator.clone());
        let mut total_withdrawn: i128 = 0;
        
        for i in 0..stream_ids.len() {
            if let Some(id) = stream_ids.get(i) {
                // Try to withdraw from each stream, ignore errors (stream might be inactive)
                if let Ok(amount) = Self::withdraw(env.clone(), id) {
                    total_withdrawn = total_withdrawn.saturating_add(amount);
                }
            }
        }
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "batch_withdrawal"), creator.clone()),
            total_withdrawn,
        );
        
        Ok(total_withdrawn)
    }
    
    /// Get active subscriber count for a creator
    pub fn get_active_subscriber_count(env: Env, creator: Address) -> u64 {
        let key = DataKey::ActiveSubscriberCount(creator);
        env.storage().persistent().get(&key).unwrap_or(0)
    }
    
    // === Admin Functions ===
    
    /// Update platform wallet (admin only)
    pub fn set_platform_wallet(env: Env, new_wallet: Address) -> Result<(), StreamError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .ok_or(StreamError::NotInitialized)?;
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::PlatformWallet, &new_wallet);
        Ok(())
    }
    
    /// Update platform fee (admin only)
    /// 
    /// # Arguments
    /// * `fee_bps` - New fee in basis points (0-1000, i.e., 0-10%)
    pub fn set_platform_fee(env: Env, fee_bps: i128) -> Result<(), StreamError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .ok_or(StreamError::NotInitialized)?;
        admin.require_auth();
        
        if fee_bps < 0 || fee_bps > 1000 {
            return Err(StreamError::InvalidFee);
        }
        
        env.storage().instance().set(&DataKey::PlatformFeeBps, &fee_bps);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "fee_updated"),),
            fee_bps,
        );
        
        Ok(())
    }
    
    /// Update grace period (admin only)
    /// 
    /// # Arguments
    /// * `grace_seconds` - New grace period in seconds
    pub fn set_grace_period(env: Env, grace_seconds: u64) -> Result<(), StreamError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .ok_or(StreamError::NotInitialized)?;
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::GracePeriod, &grace_seconds);
        
        // Emit event
        env.events().publish(
            (Symbol::new(&env, "grace_period_updated"),),
            grace_seconds,
        );
        
        Ok(())
    }
    
    /// Get current platform fee in basis points
    pub fn get_fee_bps(env: Env) -> i128 {
        Self::get_platform_fee_bps(&env)
    }
    
    /// Get current grace period in seconds
    pub fn get_grace_period_seconds(env: Env) -> u64 {
        Self::get_grace_period(&env)
    }
    
    /// Transfer admin rights (admin only)
    pub fn set_admin(env: Env, new_admin: Address) -> Result<(), StreamError> {
        let admin: Address = env.storage().instance().get(&DataKey::Admin)
            .ok_or(StreamError::NotInitialized)?;
        admin.require_auth();
        
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        Ok(())
    }
}
