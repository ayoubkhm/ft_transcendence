// src/lib/socket/connection.ts

let socketClient: WebSocket | null = null;
let connectionPromise: Promise<void> | null = null;

const eventListeners: { [key: string]: ((data: any) => void)[] } = {};

function emit(eventName: string, data: any) {
  if (eventListeners[eventName]) {
    eventListeners[eventName].forEach(callback => callback(data));
  }
}

export function on(eventName: string, callback: (data: any) => void): () => void {
  if (!eventListeners[eventName]) {
    eventListeners[eventName] = [];
  }
  eventListeners[eventName].push(callback);

  return () => {
    eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback);
  };
}

export function connect(): Promise<void> {
  if (socketClient && socketClient.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/tournaments/ws`;
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    
    socketClient = new WebSocket(wsUrl);

    socketClient.onopen = () => {
      console.log('WebSocket connection established.');
      emit('connect', null);
      resolve();
    };

    socketClient.onclose = () => {
      console.log('WebSocket connection closed. Attempting to reconnect...');
      socketClient = null;
      connectionPromise = null;
      setTimeout(connect, 3000);
    };

    socketClient.onerror = (error) => {
      console.error('WebSocket error:', error);
      connectionPromise = null;
      reject(error);
    };

    socketClient.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[WS] Received:', message);

        if (message.type) {
          emit(message.type, message.data || message);
          if (message.type === 'error') {
            console.error('[WS] Received error from server:', message);
            alert(`Server Error: ${message.message}\n\nDetails: ${message.details}`);
          }
        } else {
          console.warn('[WS] Received message without a type:', message);
        }
      } catch (e) {
        console.error('[WS] Error parsing incoming message:', e);
      }
    };
  });

  return connectionPromise;
}

export function send(message: object) {
    if (!socketClient || socketClient.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected. Cannot send message:', message);
      return;
    }
    socketClient.send(JSON.stringify(message));
}
