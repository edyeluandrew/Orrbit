// Store active WebSocket connections by user ID
const connections = new Map();

// Store connection by wallet address for public updates
const walletConnections = new Map();

/**
 * Notify a specific user via WebSocket
 */
export function notifyUser(userId, data) {
  const userConnections = connections.get(String(userId));
  if (userConnections) {
    const message = JSON.stringify(data);
    userConnections.forEach((ws) => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    });
  }
}

/**
 * Notify a wallet address (for balance updates)
 */
export function notifyWallet(walletAddress, data) {
  const wsConnections = walletConnections.get(walletAddress);
  if (wsConnections) {
    const message = JSON.stringify(data);
    wsConnections.forEach((ws) => {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    });
  }
}

/**
 * Broadcast to all connected users
 */
export function broadcast(data) {
  const message = JSON.stringify(data);
  connections.forEach((userConnections) => {
    userConnections.forEach((ws) => {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    });
  });
}

/**
 * Get connection stats
 */
export function getConnectionStats() {
  let totalConnections = 0;
  connections.forEach((userConnections) => {
    totalConnections += userConnections.size;
  });
  return {
    uniqueUsers: connections.size,
    totalConnections,
    walletConnections: walletConnections.size,
  };
}

export default async function websocketRoutes(fastify, options) {
  /**
   * WebSocket endpoint for authenticated users
   * Connect with: ws://localhost:3001/ws?token=JWT_TOKEN
   */
  fastify.get('/ws', { websocket: true }, async (connection, request) => {
    const { token, wallet } = request.query;
    let userId = null;
    let walletAddress = wallet;
    
    // Authenticate via JWT token if provided
    if (token) {
      try {
        const decoded = fastify.jwt.verify(token);
        userId = decoded.userId;
        walletAddress = decoded.walletAddress;
        
        // Store connection by user ID
        if (!connections.has(String(userId))) {
          connections.set(String(userId), new Set());
        }
        connections.get(String(userId)).add(connection.socket);
        
        // Send initial connection success
        connection.socket.send(JSON.stringify({
          type: 'connected',
          userId,
          walletAddress,
        }));
        
        fastify.log.info(`WebSocket connected: user ${userId}`);
      } catch (err) {
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid token',
        }));
        connection.socket.close();
        return;
      }
    }
    
    // Store connection by wallet address for balance updates
    if (walletAddress) {
      if (!walletConnections.has(walletAddress)) {
        walletConnections.set(walletAddress, new Set());
      }
      walletConnections.get(walletAddress).add(connection.socket);
    }
    
    // Handle incoming messages
    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        switch (data.type) {
          case 'ping':
            connection.socket.send(JSON.stringify({ type: 'pong' }));
            break;
            
          case 'subscribe':
            // Subscribe to specific event types
            if (data.events && Array.isArray(data.events)) {
              connection.socket.subscribedEvents = data.events;
              connection.socket.send(JSON.stringify({
                type: 'subscribed',
                events: data.events,
              }));
            }
            break;
            
          case 'unsubscribe':
            connection.socket.subscribedEvents = [];
            connection.socket.send(JSON.stringify({ type: 'unsubscribed' }));
            break;
            
          default:
            // Unknown message type
            break;
        }
      } catch (err) {
        fastify.log.error('WebSocket message error:', err);
      }
    });
    
    // Handle disconnection
    connection.socket.on('close', () => {
      if (userId) {
        const userConns = connections.get(String(userId));
        if (userConns) {
          userConns.delete(connection.socket);
          if (userConns.size === 0) {
            connections.delete(String(userId));
          }
        }
        fastify.log.info(`WebSocket disconnected: user ${userId}`);
      }
      
      if (walletAddress) {
        const walletConns = walletConnections.get(walletAddress);
        if (walletConns) {
          walletConns.delete(connection.socket);
          if (walletConns.size === 0) {
            walletConnections.delete(walletAddress);
          }
        }
      }
    });
    
    // Handle errors
    connection.socket.on('error', (error) => {
      fastify.log.error('WebSocket error:', error);
    });
  });
  
  /**
   * GET /api/ws/stats
   * Get WebSocket connection statistics (admin only)
   */
  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    // Check if user is admin (you can implement proper admin check)
    const stats = getConnectionStats();
    return stats;
  });
}
