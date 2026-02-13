import * as StellarSdk from '@stellar/stellar-sdk';

const NETWORK = process.env.STELLAR_NETWORK?.toUpperCase() || 'TESTNET';
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || (
  NETWORK === 'PUBLIC' 
    ? 'https://horizon.stellar.org'
    : 'https://horizon-testnet.stellar.org'
);

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

/**
 * Verify a Stellar transaction exists and matches expected parameters
 */
export async function verifyTransaction(txHash, expectedFrom, expectedTo, expectedAmount) {
  try {
    const transaction = await server.transactions().transaction(txHash).call();
    
    if (!transaction.successful) {
      return { valid: false, error: 'Transaction was not successful' };
    }
    
    // Get operations for this transaction
    const operations = await server.operations().forTransaction(txHash).call();
    
    // Find payment operation matching our criteria
    for (const op of operations.records) {
      if (op.type === 'payment' && op.asset_type === 'native') {
        const amountMatches = !expectedAmount || 
          Math.abs(parseFloat(op.amount) - expectedAmount) < 0.0000001;
        const fromMatches = !expectedFrom || op.from === expectedFrom;
        const toMatches = !expectedTo || op.to === expectedTo;
        
        if (fromMatches && toMatches && amountMatches) {
          return {
            valid: true,
            transaction: {
              id: transaction.id,
              hash: transaction.hash,
              created_at: transaction.created_at,
              source_account: transaction.source_account,
              fee_paid: transaction.fee_charged,
              memo: transaction.memo,
            },
            payment: {
              from: op.from,
              to: op.to,
              amount: parseFloat(op.amount),
            },
          };
        }
      }
    }
    
    return { valid: false, error: 'No matching payment operation found' };
  } catch (error) {
    if (error.response?.status === 404) {
      return { valid: false, error: 'Transaction not found' };
    }
    throw error;
  }
}

/**
 * Get account balance
 */
export async function getAccountBalance(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const xlmBalance = account.balances.find(b => b.asset_type === 'native');
    return {
      xlm: xlmBalance ? parseFloat(xlmBalance.balance) : 0,
      balances: account.balances,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      return { xlm: 0, balances: [], error: 'Account not found or not funded' };
    }
    throw error;
  }
}

/**
 * Get recent transactions for an account
 */
export async function getAccountTransactions(publicKey, limit = 10) {
  try {
    const transactions = await server
      .transactions()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit)
      .call();
    
    return transactions.records.map(tx => ({
      id: tx.id,
      hash: tx.hash,
      created_at: tx.created_at,
      source_account: tx.source_account,
      fee_paid: tx.fee_charged,
      memo: tx.memo || null,
      successful: tx.successful,
    }));
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Get recent payments for an account
 */
export async function getAccountPayments(publicKey, limit = 20) {
  try {
    const payments = await server
      .payments()
      .forAccount(publicKey)
      .order('desc')
      .limit(limit)
      .call();
    
    return payments.records
      .filter(p => p.type === 'payment' || p.type === 'create_account')
      .map(p => ({
        id: p.id,
        type: p.type,
        created_at: p.created_at,
        from: p.from || p.funder,
        to: p.to || p.account,
        amount: p.amount || p.starting_balance,
        asset_type: p.asset_type || 'native',
        asset_code: p.asset_code,
        transaction_hash: p.transaction_hash,
        transaction_successful: p.transaction_successful,
      }));
  } catch (error) {
    if (error.response?.status === 404) {
      return [];
    }
    throw error;
  }
}

/**
 * Stream payments for an account (for real-time updates)
 */
export function streamAccountPayments(publicKey, onPayment) {
  const close = server
    .payments()
    .forAccount(publicKey)
    .cursor('now')
    .stream({
      onmessage: (payment) => {
        if (payment.type === 'payment' && payment.asset_type === 'native') {
          onPayment({
            id: payment.id,
            from: payment.from,
            to: payment.to,
            amount: parseFloat(payment.amount),
            transaction_hash: payment.transaction_hash,
            created_at: payment.created_at,
          });
        }
      },
      onerror: (error) => {
        console.error('Payment stream error:', error);
      },
    });
  
  return close;
}

/**
 * Build a subscription payment transaction (unsigned)
 * This is built on the server for consistency but signed by the client
 */
export async function buildSubscriptionTransaction(fromPublicKey, toPublicKey, amountXlm, memo) {
  const sourceAccount = await server.loadAccount(fromPublicKey);
  
  const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK === 'PUBLIC' 
      ? StellarSdk.Networks.PUBLIC 
      : StellarSdk.Networks.TESTNET,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: toPublicKey,
      asset: StellarSdk.Asset.native(),
      amount: amountXlm.toFixed(7),
    }))
    .addMemo(StellarSdk.Memo.text(memo || 'Orrbit Subscription'))
    .setTimeout(300) // 5 minutes
    .build();
  
  return {
    xdr: transaction.toXDR(),
    hash: transaction.hash().toString('hex'),
  };
}

/**
 * Verify a signed transaction matches what we built
 */
export function verifySignedTransaction(signedXdr, expectedHash) {
  try {
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK === 'PUBLIC' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET
    );
    
    return transaction.hash().toString('hex') === expectedHash;
  } catch (error) {
    return false;
  }
}

/**
 * Process a subscription payment (verify and submit if valid)
 */
export async function processSubscriptionPayment(signedXdr) {
  try {
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK === 'PUBLIC' ? StellarSdk.Networks.PUBLIC : StellarSdk.Networks.TESTNET
    );
    
    const result = await server.submitTransaction(transaction);
    
    return {
      success: true,
      hash: result.hash,
      ledger: result.ledger,
      result,
    };
  } catch (error) {
    if (error.response?.data?.extras?.result_codes) {
      return {
        success: false,
        error: 'Transaction failed',
        codes: error.response.data.extras.result_codes,
      };
    }
    throw error;
  }
}

export default {
  server,
  NETWORK,
  HORIZON_URL,
  verifyTransaction,
  getAccountBalance,
  getAccountTransactions,
  getAccountPayments,
  streamAccountPayments,
  buildSubscriptionTransaction,
  verifySignedTransaction,
  processSubscriptionPayment,
};
