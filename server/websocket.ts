import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

/**
 * WebSocket Server for real-time updates
 */

export interface WSMessage {
  type: 'agent_update' | 'inventory_update' | 'decision_update' | 'alert' | 'notification';
  data: any;
  timestamp: Date;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('✅ New WebSocket client connected');
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('👋 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'notification',
        data: { message: 'Connected to StockSage real-time updates' },
        timestamp: new Date(),
      });
    });

    console.log('✅ WebSocket server initialized on path /ws');
  }

  /**
   * Handle incoming messages from clients
   */
  private handleMessage(ws: WebSocket, message: any) {
    console.log('Received message from client:', message);
    
    // Handle different message types
    if (message.type === 'ping') {
      this.sendToClient(ws, {
        type: 'notification',
        data: { message: 'pong' },
        timestamp: new Date(),
      });
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(ws: WebSocket, message: WSMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: WSMessage) {
    const payload = JSON.stringify(message);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  /**
   * Send agent activity update
   */
  sendAgentUpdate(agentType: string, action: string, data: any) {
    this.broadcast({
      type: 'agent_update',
      data: {
        agentType,
        action,
        ...data,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Send inventory update
   */
  sendInventoryUpdate(productId: number, locationId: number, newStock: number, previousStock: number) {
    this.broadcast({
      type: 'inventory_update',
      data: {
        productId,
        locationId,
        newStock,
        previousStock,
        change: newStock - previousStock,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Send decision update
   */
  sendDecisionUpdate(decisionId: number, status: string, details: any) {
    this.broadcast({
      type: 'decision_update',
      data: {
        decisionId,
        status,
        ...details,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Send alert
   */
  sendAlert(severity: 'info' | 'warning' | 'error', message: string, details?: any) {
    this.broadcast({
      type: 'alert',
      data: {
        severity,
        message,
        details,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Get number of connected clients
   */
  getClientCount(): number {
    return this.clients.size;
  }
}

export const wsManager = new WebSocketManager();
