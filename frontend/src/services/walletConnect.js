/**
 * WalletConnect Service for LOBSTR Wallet Integration
 *
 * Enables connecting to LOBSTR mobile wallet via WalletConnect v2 protocol.
 * Supports Stellar transaction signing and account management.
 */

import SignClient from '@walletconnect/sign-client';

// ✅ FIX 1: PROJECT_ID must be a real UUID from https://cloud.walletconnect.com
// The fallback string 'orbit-stellar-dapp' is NOT a valid project ID and will
// cause WalletConnect to reject initialization entirely.
const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
if (!PROJECT_ID) {
  console.error(
    '[WalletConnect] VITE_WALLETCONNECT_PROJECT_ID is not set. ' +
    'Register at https://cloud.walletconnect.com and add it to your .env file.'
  );
}

// ✅ FIX 2: LOBSTR ONLY supports 'stellar:pubnet' as the chain identifier.
// It does NOT expose a 'stellar:testnet' chain — even if your user has a
// testnet account, the WalletConnect session is always established under pubnet.
// Using 'stellar:testnet' here causes signing requests to fail with a chainId mismatch.
const STELLAR_CHAIN = 'stellar:pubnet';

// LOBSTR app metadata for the connection dialog shown to the user
const LOBSTR_METADATA = {
  name: 'Orbit',
  description: 'Crypto Payment Layer for Content Creators',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://orbit.app',
  icons: ['https://orbit.app/logo.png'],
};

/** WalletConnect client singleton */
let signClient = null;
let currentSession = null;

// ─── Abort controller for pending approval ────────────────────────────────────
// ✅ FIX 7: Track whether we are actively waiting for approval so we can cancel
// it if the user navigates away, preventing ghost callbacks after disconnect.
let approvalAborted = false;

/**
 * Initialize WalletConnect SignClient (singleton).
 */
export async function initWalletConnect() {
  if (signClient) return signClient;

  try {
    signClient = await SignClient.init({
      projectId: PROJECT_ID,
      metadata: LOBSTR_METADATA,
    });

    // ✅ FIX 4: The session_event handler receives { id, topic, params },
    // NOT { event } directly. Destructuring { event } silently gives undefined.
    signClient.on('session_event', ({ id, topic, params }) => {
      console.log('WalletConnect session event:', { id, topic, params });
    });

    signClient.on('session_update', ({ topic, params }) => {
      console.log('WalletConnect session updated:', topic, params);
      const { namespaces } = params;
      const session = signClient.session.get(topic);
      currentSession = { ...session, namespaces };
    });

    signClient.on('session_delete', ({ topic }) => {
      console.log('WalletConnect session deleted:', topic);
      if (currentSession?.topic === topic) {
        currentSession = null;
      }
    });

    // Restore existing session if one exists from a previous page load
    const sessions = signClient.session.getAll();
    if (sessions.length > 0) {
      currentSession = sessions[sessions.length - 1];
    }

    return signClient;
  } catch (error) {
    console.error('Failed to initialize WalletConnect:', error);
    signClient = null; // Reset so next call retries properly
    throw error;
  }
}

/**
 * Connect to LOBSTR wallet via WalletConnect.
 *
 * @returns {Promise<{uri: string, approval: Function}>}
 *   uri     — the wc: URI to encode in the QR code
 *   approval — call this to await the user scanning & approving
 */
export async function connectLobstr() {
  const client = await initWalletConnect();
  approvalAborted = false;

  try {
    // ✅ FIX 2 (continued): Use `requiredNamespaces` (not optionalNamespaces) with
    // `stellar:pubnet` as the chain. LOBSTR requires this exact structure to show
    // a proper connection dialog. Using optionalNamespaces causes LOBSTR to ignore
    // the request or return an unexpected namespace shape.
    const { uri, approval } = await client.connect({
      requiredNamespaces: {
        stellar: {
          methods: ['stellar_signAndSubmitXDR', 'stellar_signXDR'],
          chains: ['stellar:pubnet'],
          events: [],
        },
      },
    });

    if (!uri) {
      throw new Error('WalletConnect did not return a URI. Check your Project ID.');
    }

    console.log('WalletConnect URI generated:', uri);
    return { uri, approval };
  } catch (error) {
    console.error('Failed to create WalletConnect connection:', error);
    throw error;
  }
}

/**
 * Wait for the user to scan the QR code and approve in LOBSTR.
 * Extracts the Stellar public key from the approved session.
 *
 * @param {Function} approval - The approval function returned by connectLobstr()
 * @returns {Promise<{publicKey: string, session: object}>}
 */
export async function waitForApproval(approval) {
  try {
    const session = await approval();
    
    // ✅ FIX 7: If the user hit "Back" while we were waiting, bail out cleanly
    // instead of calling onConnect with a stale result.
    if (approvalAborted) {
      throw new Error('Connection cancelled by user');
    }

    currentSession = session;
    console.log('WalletConnect session approved:', session);

    // LOBSTR returns accounts in the `stellar` namespace as:
    // ["stellar:pubnet:GABC...XYZ"]
    const stellarNamespace = session.namespaces?.stellar;

    if (!stellarNamespace?.accounts?.length) {
      throw new Error(
        'No Stellar account found in session. ' +
        'Received namespaces: ' + JSON.stringify(session.namespaces)
      );
    }

    // Account format is always "stellar:pubnet:GPUBLICKEY..."
    const accountString = stellarNamespace.accounts[0];
    const parts = accountString.split(':');
    const publicKey = parts[parts.length - 1];

    if (!publicKey?.startsWith('G') || publicKey.length !== 56) {
      throw new Error(`Invalid Stellar public key extracted: "${publicKey}"`);
    }

    console.log('Extracted public key:', publicKey);
    return { publicKey, session };
  } catch (error) {
    console.error('Session approval failed:', error);
    throw error;
  }
}

/**
 * Cancel a pending approval (call when user navigates away from QR screen).
 */
export function abortApproval() {
  approvalAborted = true;
}

/**
 * Sign a Stellar transaction XDR using LOBSTR.
 *
 * @param {string} xdr - Transaction XDR to sign
 * @returns {Promise<string>} Signed transaction XDR
 */
export async function signTransaction(xdr) {
  if (!currentSession) {
    throw new Error('No active WalletConnect session. Please connect first.');
  }

  const client = await initWalletConnect();

  try {
    // ✅ FIX 3: chainId MUST match the chain used during session establishment.
    // We use STELLAR_CHAIN ('stellar:pubnet') consistently here and in connectLobstr().
    const result = await client.request({
      topic: currentSession.topic,
      chainId: STELLAR_CHAIN,
      request: {
        method: 'stellar_signXDR',
        params: { xdr },
      },
    });

    return result.signedXDR;
  } catch (error) {
    console.error('Failed to sign transaction:', error);
    throw error;
  }
}

/**
 * Sign and submit a Stellar transaction using LOBSTR.
 *
 * @param {string} xdr - Transaction XDR to sign and submit
 * @returns {Promise<{hash: string}>} Transaction result
 */
export async function signAndSubmitTransaction(xdr) {
  if (!currentSession) {
    throw new Error('No active WalletConnect session. Please connect first.');
  }

  const client = await initWalletConnect();

  try {
    const result = await client.request({
      topic: currentSession.topic,
      chainId: STELLAR_CHAIN, // ✅ FIX 3: consistent chain ID
      request: {
        method: 'stellar_signAndSubmitXDR',
        params: { xdr },
      },
    });

    return result;
  } catch (error) {
    console.error('Failed to sign and submit transaction:', error);
    throw error;
  }
}

/**
 * Disconnect the current WalletConnect session.
 */
export async function disconnectLobstr() {
  abortApproval(); // Cancel any pending approval too

  if (!currentSession || !signClient) {
    currentSession = null;
    return;
  }

  try {
    await signClient.disconnect({
      topic: currentSession.topic,
      reason: { code: 6000, message: 'User disconnected' },
    });
  } catch (error) {
    console.error('Failed to disconnect:', error);
  } finally {
    currentSession = null;
  }
}

/** Returns true if there is an active session. */
export function hasActiveSession() {
  return currentSession !== null;
}

/** Returns the current session's Stellar public key, or null. */
export function getCurrentPublicKey() {
  if (!currentSession) return null;

  const accounts = currentSession.namespaces?.stellar?.accounts ?? [];
  if (!accounts.length) return null;

  const parts = accounts[0].split(':');
  return parts[parts.length - 1] || null;
}

/**
 * Attempt to restore a previous session on page load.
 * @returns {Promise<{publicKey: string, session: object} | null>}
 */
export async function restoreSession() {
  try {
    const client = await initWalletConnect();
    const sessions = client.session.getAll();

    if (sessions.length > 0) {
      currentSession = sessions[sessions.length - 1];
      const publicKey = getCurrentPublicKey();
      if (publicKey) {
        return { publicKey, session: currentSession };
      }
    }

    return null;
  } catch (error) {
    console.error('Failed to restore session:', error);
    return null;
  }
}

export default {
  initWalletConnect,
  connectLobstr,
  waitForApproval,
  abortApproval,
  signTransaction,
  signAndSubmitTransaction,
  disconnectLobstr,
  hasActiveSession,
  getCurrentPublicKey,
  restoreSession,
};