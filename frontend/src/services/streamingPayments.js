/**
 * Orbit Streaming Payments SDK
 * 
 * JavaScript client for interacting with the Soroban streaming payments contract.
 * Enables "pay-as-you-go" subscriptions where funds stream in real-time.
 */

import * as StellarSdk from '@stellar/stellar-sdk';
import { rpc } from '@stellar/stellar-sdk';

// Contract constants (defaults, actual values stored on-chain)
const DEFAULT_PLATFORM_FEE_BPS = 200; // 2%
const BPS_DENOMINATOR = 10000;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_MONTH = 30 * SECONDS_PER_DAY;
const DEFAULT_GRACE_PERIOD = 86400; // 24 hours

/**
 * Stream status enum matching the contract
 */
export const StreamStatus = {
  Active: 'Active',
  Cancelled: 'Cancelled',
  Completed: 'Completed',
};

/**
 * Streaming Payments Client
 */
export class StreamingPaymentsClient {
  constructor(options = {}) {
    this.networkPassphrase = options.networkPassphrase || StellarSdk.Networks.TESTNET;
    this.horizonUrl = options.horizonUrl || 'https://horizon-testnet.stellar.org';
    this.sorobanUrl = options.sorobanUrl || 'https://soroban-testnet.stellar.org';
    this.contractId = options.contractId || null;
    
    this.server = new StellarSdk.Horizon.Server(this.horizonUrl);
    this.soroban = new rpc.Server(this.sorobanUrl);
  }
  
  /**
   * Set the contract ID
   */
  setContractId(contractId) {
    this.contractId = contractId;
  }
  
  /**
   * Calculate streaming rate per second from monthly amount
   * @param {number} monthlyAmount - Amount in XLM per month
   * @returns {string} Rate per second in stroops
   */
  calculateRatePerSecond(monthlyAmount) {
    const stroops = BigInt(Math.floor(monthlyAmount * 10_000_000));
    const rate = stroops / BigInt(SECONDS_PER_MONTH);
    return rate.toString();
  }
  
  /**
   * Calculate how much has been earned at a given point in time
   * @param {Object} stream - Stream object
   * @param {number} timestamp - Unix timestamp (optional, defaults to now)
   * @returns {number} Amount earned in XLM
   */
  calculateEarned(stream, timestamp = Math.floor(Date.now() / 1000)) {
    const elapsed = Math.min(
      timestamp - stream.startTime,
      stream.endTime - stream.startTime
    );
    const earned = (BigInt(stream.ratePerSecond) * BigInt(elapsed)) / BigInt(10_000_000);
    return Number(earned) / 10_000_000; // Convert back from stroops to XLM
  }
  
  /**
   * Calculate withdrawable amount (after platform fee)
   * @param {Object} stream - Stream object
   * @returns {number} Withdrawable amount in XLM
   */
  calculateWithdrawable(stream) {
    const earned = this.calculateEarned(stream);
    const withdrawn = stream.withdrawn / 10_000_000;
    const pending = earned - withdrawn;
    const fee = pending * PLATFORM_FEE_BPS / BPS_DENOMINATOR;
    return pending - fee;
  }
  
  /**
   * Calculate refundable amount if cancelled now
   * @param {Object} stream - Stream object
   * @returns {number} Refundable amount in XLM
   */
  calculateRefundable(stream) {
    const earned = this.calculateEarned(stream);
    const withdrawn = stream.withdrawn / 10_000_000;
    const total = stream.totalAmount / 10_000_000;
    return total - earned;
  }
  
  /**
   * Build transaction to create a new stream
   * @param {Object} params - Stream parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildCreateStreamTransaction({
    subscriberPublicKey,
    creatorPublicKey,
    tokenAddress, // Use native XLM contract address or custom token
    amount,
    durationSeconds,
    tierId,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(subscriberPublicKey);
    
    // Convert amount to stroops
    const amountStroops = BigInt(Math.floor(amount * 10_000_000));
    
    // Build the contract invocation
    const contract = new StellarSdk.Contract(this.contractId);
    
    const args = [
      StellarSdk.nativeToScVal(subscriberPublicKey, { type: 'address' }),
      StellarSdk.nativeToScVal(creatorPublicKey, { type: 'address' }),
      StellarSdk.nativeToScVal(tokenAddress, { type: 'address' }),
      StellarSdk.nativeToScVal(amountStroops, { type: 'i128' }),
      StellarSdk.nativeToScVal(durationSeconds, { type: 'u64' }),
      StellarSdk.nativeToScVal(tierId, { type: 'u32' }),
    ];
    
    const operation = contract.call('create_stream', ...args);
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    // Simulate to get resource usage
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    // Assemble transaction with proper resources
    const assembled = StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated);
    
    return assembled.build();
  }
  
  /**
   * Build transaction for creator to withdraw earnings
   * @param {Object} params - Withdrawal parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildWithdrawTransaction({
    creatorPublicKey,
    streamId,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(creatorPublicKey);
    const contract = new StellarSdk.Contract(this.contractId);
    
    const operation = contract.call(
      'withdraw',
      StellarSdk.nativeToScVal(streamId, { type: 'u64' })
    );
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
  }
  
  /**
   * Build transaction for subscriber to cancel and get refund
   * @param {Object} params - Cancellation parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildCancelTransaction({
    subscriberPublicKey,
    streamId,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(subscriberPublicKey);
    const contract = new StellarSdk.Contract(this.contractId);
    
    const operation = contract.call(
      'cancel',
      StellarSdk.nativeToScVal(streamId, { type: 'u64' })
    );
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
  }
  
  /**
   * Build transaction for subscriber to extend their stream
   * @param {Object} params - Extension parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildExtendStreamTransaction({
    subscriberPublicKey,
    streamId,
    additionalAmount,
    additionalDuration,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(subscriberPublicKey);
    const contract = new StellarSdk.Contract(this.contractId);
    
    // Convert amount to stroops
    const amountStroops = BigInt(Math.floor(additionalAmount * 10_000_000));
    
    const operation = contract.call(
      'extend_stream',
      StellarSdk.nativeToScVal(streamId, { type: 'u64' }),
      StellarSdk.nativeToScVal(amountStroops, { type: 'i128' }),
      StellarSdk.nativeToScVal(additionalDuration, { type: 'u64' })
    );
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
  }
  
  /**
   * Build transaction to toggle auto-renewal
   * @param {Object} params - Toggle parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildToggleAutoRenewTransaction({
    subscriberPublicKey,
    streamId,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(subscriberPublicKey);
    const contract = new StellarSdk.Contract(this.contractId);
    
    const operation = contract.call(
      'toggle_auto_renew',
      StellarSdk.nativeToScVal(streamId, { type: 'u64' })
    );
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
  }
  
  /**
   * Build transaction for creator to terminate a stream
   * @param {Object} params - Termination parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildTerminateStreamTransaction({
    creatorPublicKey,
    streamId,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(creatorPublicKey);
    const contract = new StellarSdk.Contract(this.contractId);
    
    const operation = contract.call(
      'terminate_stream',
      StellarSdk.nativeToScVal(streamId, { type: 'u64' })
    );
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
  }
  
  /**
   * Build transaction for creator to withdraw from all streams
   * @param {Object} params - Withdrawal parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildWithdrawAllTransaction({
    creatorPublicKey,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(creatorPublicKey);
    const contract = new StellarSdk.Contract(this.contractId);
    
    const operation = contract.call('withdraw_all');
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
  }
  
  /**
   * Build transaction to renew an expired stream
   * @param {Object} params - Renewal parameters
   * @returns {Promise<StellarSdk.Transaction>}
   */
  async buildRenewStreamTransaction({
    callerPublicKey,
    streamId,
  }) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const account = await this.server.loadAccount(callerPublicKey);
    const contract = new StellarSdk.Contract(this.contractId);
    
    const operation = contract.call(
      'renew_stream',
      StellarSdk.nativeToScVal(streamId, { type: 'u64' })
    );
    
    const transaction = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();
    
    const simulated = await this.soroban.simulateTransaction(transaction);
    
    if (StellarSdk.SorobanRpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }
    
    return StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
  }
  
  /**
   * Get count of active subscribers for a creator
   * @param {string} creatorPublicKey
   * @returns {Promise<number>}
   */
  async getActiveSubscriberCount(creatorPublicKey) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const contract = new StellarSdk.Contract(this.contractId);
    
    const result = await this.soroban.invokeContractFunction(
      contract.call(
        'get_active_subscriber_count',
        StellarSdk.nativeToScVal(creatorPublicKey, { type: 'address' })
      )
    );
    
    return Number(result);
  }
  
  /**
   * Query stream details from contract
   * @param {number} streamId - Stream ID
   * @returns {Promise<Object>}
   */
  async getStream(streamId) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const contract = new StellarSdk.Contract(this.contractId);
    
    const result = await this.soroban.invokeContractFunction(
      contract.call(
        'get_stream',
        StellarSdk.nativeToScVal(streamId, { type: 'u64' })
      )
    );
    
    return this.parseStreamResult(result);
  }
  
  /**
   * Get all streams for a subscriber
   * @param {string} subscriberPublicKey
   * @returns {Promise<number[]>}
   */
  async getSubscriberStreams(subscriberPublicKey) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const contract = new StellarSdk.Contract(this.contractId);
    
    const result = await this.soroban.invokeContractFunction(
      contract.call(
        'get_subscriber_streams',
        StellarSdk.nativeToScVal(subscriberPublicKey, { type: 'address' })
      )
    );
    
    // Parse result to array of stream IDs
    return result.map(id => Number(id));
  }
  
  /**
   * Get all streams for a creator
   * @param {string} creatorPublicKey
   * @returns {Promise<number[]>}
   */
  async getCreatorStreams(creatorPublicKey) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const contract = new StellarSdk.Contract(this.contractId);
    
    const result = await this.soroban.invokeContractFunction(
      contract.call(
        'get_creator_streams',
        StellarSdk.nativeToScVal(creatorPublicKey, { type: 'address' })
      )
    );
    
    return result.map(id => Number(id));
  }
  
  /**
   * Check if there's an active stream between two addresses
   * @param {string} subscriberPublicKey
   * @param {string} creatorPublicKey
   * @returns {Promise<boolean>}
   */
  async hasActiveStream(subscriberPublicKey, creatorPublicKey) {
    if (!this.contractId) {
      throw new Error('Contract ID not set');
    }
    
    const contract = new StellarSdk.Contract(this.contractId);
    
    const result = await this.soroban.invokeContractFunction(
      contract.call(
        'has_active_stream',
        StellarSdk.nativeToScVal(subscriberPublicKey, { type: 'address' }),
        StellarSdk.nativeToScVal(creatorPublicKey, { type: 'address' })
      )
    );
    
    return result === true;
  }
  
  /**
   * Parse stream result from Soroban
   */
  parseStreamResult(scVal) {
    // Parse Soroban contract return value to JS object
    return {
      id: Number(scVal.id),
      subscriber: scVal.subscriber,
      creator: scVal.creator,
      token: scVal.token,
      totalAmount: Number(scVal.total_amount),
      ratePerSecond: scVal.rate_per_second.toString(),
      startTime: Number(scVal.start_time),
      endTime: Number(scVal.end_time),
      withdrawn: Number(scVal.withdrawn),
      status: scVal.status,
      tierId: Number(scVal.tier_id),
      autoRenew: scVal.auto_renew || false,
      durationSeconds: Number(scVal.duration_seconds || 0),
    };
  }
  
  /**
   * Submit a signed transaction
   * @param {StellarSdk.Transaction} transaction - Signed transaction
   * @returns {Promise<Object>}
   */
  async submitTransaction(transaction) {
    const result = await this.soroban.sendTransaction(transaction);
    
    if (result.status === 'ERROR') {
      throw new Error(`Transaction failed: ${result.errorResultXdr}`);
    }
    
    // Poll for completion
    let status = result;
    while (status.status === 'PENDING') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await this.soroban.getTransaction(result.hash);
    }
    
    if (status.status !== 'SUCCESS') {
      throw new Error(`Transaction failed: ${status.status}`);
    }
    
    return status;
  }
}

/**
 * Helper to format stream for display
 */
export function formatStreamForDisplay(stream, client) {
  const now = Math.floor(Date.now() / 1000);
  const totalDuration = stream.endTime - stream.startTime;
  const elapsed = Math.min(now - stream.startTime, totalDuration);
  const progress = (elapsed / totalDuration) * 100;
  
  const earned = client.calculateEarned(stream);
  const withdrawable = client.calculateWithdrawable(stream);
  const refundable = client.calculateRefundable(stream);
  
  const totalXlm = stream.totalAmount / 10_000_000;
  const ratePerSecond = BigInt(stream.ratePerSecond);
  const dailyRate = Number((ratePerSecond * BigInt(SECONDS_PER_DAY)) / BigInt(10_000_000)) / 10_000_000;
  
  return {
    ...stream,
    // Display values
    totalXlm,
    dailyRate,
    earnedXlm: earned,
    withdrawableXlm: withdrawable,
    refundableXlm: refundable,
    progressPercent: progress.toFixed(1),
    
    // Time info
    elapsedSeconds: elapsed,
    remainingSeconds: totalDuration - elapsed,
    totalDurationSeconds: totalDuration,
    
    // Formatted strings
    elapsedDays: (elapsed / SECONDS_PER_DAY).toFixed(1),
    remainingDays: ((totalDuration - elapsed) / SECONDS_PER_DAY).toFixed(1),
    
    // Status helpers
    isActive: stream.status === StreamStatus.Active,
    isCompleted: stream.status === StreamStatus.Completed,
    isCancelled: stream.status === StreamStatus.Cancelled,
  };
}

/**
 * Calculate monthly cost from stream parameters
 */
export function calculateMonthlyCost(ratePerSecond) {
  const rate = BigInt(ratePerSecond);
  const monthly = (rate * BigInt(SECONDS_PER_MONTH)) / BigInt(10_000_000);
  return Number(monthly) / 10_000_000;
}

export default StreamingPaymentsClient;
