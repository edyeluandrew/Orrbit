import React, { useState } from 'react';
import { Shield, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import * as StellarSdk from "stellar-sdk";
import { isConnected, signTransaction } from '@stellar/freighter-api';

function TrustlineSetup({ wallet, hasUSDCTrustline, onTrustlineEstablished }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // USDC Asset Details (Testnet)
  const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
  const USDC_CODE = 'USDC';

  const establishTrustline = async () => {
    if (!wallet?.publicKey) {
      setError('No wallet connected');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      
      // Load account
      const account = await server.loadAccount(wallet.publicKey);
      
      // Create USDC asset
      const usdcAsset = new StellarSdk.Asset(USDC_CODE, USDC_ISSUER);
      
      // Build transaction to establish trustline
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.changeTrust({
            asset: usdcAsset,
            limit: '1000000',
          })
        )
        .setTimeout(180)
        .build();

      // Sign and submit transaction
      if (wallet.type === 'connected') {
        const connected = await isConnected();
        if (!connected) {
          throw new Error('Freighter wallet not connected. Please connect your wallet first.');
        }
        
        // Sign the transaction using Freighter API
        console.log('Signing trustline transaction...');
        const xdr = transaction.toXDR();
        
        // Freighter returns an object with the signed XDR
        const signedResult = await signTransaction(xdr, {
          networkPassphrase: StellarSdk.Networks.TESTNET,
        });
        
        // Extract the signed XDR string from the result
        const signedXDR = signedResult.signedTxXdr || signedResult;
        
        console.log('Signed XDR type:', typeof signedXDR);
        console.log('Signed XDR value:', signedXDR);
        
        // Reconstruct the transaction from the signed XDR
        const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
          signedXDR,
          StellarSdk.Networks.TESTNET
        );
        
        // Submit using the SDK's built-in method
        console.log('Submitting trustline transaction...');
        const result = await server.submitTransaction(signedTransaction);
        
        console.log('Trustline established!', result);
        setSuccess(true);
        
        if (onTrustlineEstablished) {
          onTrustlineEstablished();
        }
      } else {
        setError('Please use Freighter wallet to establish trustline for security');
        return;
      }

    } catch (err) {
      console.error('Trustline error:', err);
      
      let errorMessage = 'Failed to establish trustline';
      
      if (err.message?.includes('User declined') || err.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected. Please try again and approve the transaction in Freighter.';
      } else if (err.message?.includes('op_low_reserve')) {
        errorMessage = 'Insufficient XLM balance. You need at least 1 XLM to create a trustline.';
      } else if (err.message?.includes('op_line_full')) {
        errorMessage = 'Trustline limit would be exceeded.';
      } else if (err.message?.includes('op_no_trust')) {
        errorMessage = 'Asset issuer does not exist.';
      } else if (err.message?.includes('op_already_exists')) {
        errorMessage = 'Trustline already exists for this asset.';
      } else if (err.response?.data?.extras?.result_codes) {
        // Handle Horizon API error responses
        const resultCodes = err.response.data.extras.result_codes;
        errorMessage = resultCodes.operations?.[0] || resultCodes.transaction || errorMessage;
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (hasUSDCTrustline) {
    return (
      <div className="card-neumorphic p-6 bg-green-900/20 border-green-500/30">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-green-400" />
          <div>
            <h3 className="text-green-400 font-bold text-lg">USDC Trustline Active</h3>
            <p className="text-green-300/80 text-sm">Your wallet can now receive USDC tokens</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-neumorphic p-6">
      <div className="flex items-center gap-3 mb-4">
        <Shield size={24} className="text-yellow-400" />
        <h3 className="text-yellow-400 font-bold text-lg">Setup USDC Trustline</h3>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
          <p className="text-gray-300 text-sm leading-relaxed mb-3">
            Before you can receive USDC for subscription payments, you need to establish a <strong>trustline</strong>.
          </p>
          <p className="text-gray-400 text-xs leading-relaxed">
            💡 A trustline tells the Stellar network that your wallet trusts and wants to hold USDC tokens. 
            This is a one-time setup that costs a small XLM fee (~0.00001 XLM) and requires a 0.5 XLM reserve.
          </p>
        </div>

        {success && (
          <div className="p-4 bg-green-900/30 border-2 border-green-500/50 rounded-xl flex items-center gap-2">
            <CheckCircle size={18} className="text-green-400" />
            <p className="text-green-300 text-sm">Trustline established successfully!</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/30 border-2 border-red-600/50 rounded-xl flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400" />
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={establishTrustline}
          disabled={loading || success}
          className="w-full btn-gold py-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2 transition-smooth disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" /> Establishing Trustline...
            </>
          ) : success ? (
            <>
              <CheckCircle size={20} /> Trustline Established
            </>
          ) : (
            <>
              <Shield size={20} /> Establish USDC Trustline
            </>
          )}
        </button>

        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-3">
          <p className="text-blue-300 text-xs">
            ⚠️ <strong>Important:</strong> You must use Freighter wallet to sign this transaction. 
            Make sure Freighter is on Testnet mode and you have at least 1 XLM in your account.
          </p>
        </div>
      </div>
    </div>
  );
}

export default TrustlineSetup;