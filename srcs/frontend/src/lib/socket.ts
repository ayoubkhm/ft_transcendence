// src/lib/socket.ts

// This will hold the single, persistent WebSocket connection.
let socketClient: WebSocket | null = null;

// A simple event emitter to allow different parts of the UI to subscribe to WebSocket events.
const eventListeners: { [key: string]: ((data: any) => void)[] } = {};

/**
 * Emits an event to all registered listeners.
 * @param eventName The name of the event (e.g., 'dashboard-update').
 * @param data The data associated with the event.
 */
function emit(eventName: string, data: any) {
  if (eventListeners[eventName]) {
    eventListeners[eventName].forEach(callback => callback(data));
  }
}

/**
 * Allows a UI component to subscribe to a specific message type from the WebSocket.
 * @param eventName The event to subscribe to.
 * @param callback The function to call when the event is received.
 * @returns A function to unsubscribe.
 */
export function on(eventName: string, callback: (data: any) => void): () => void {
  if (!eventListeners[eventName]) {
    eventListeners[eventName] = [];
  }
  eventListeners[eventName].push(callback);

  // Return an unsubscribe function
  return () => {
    eventListeners[eventName] = eventListeners[eventName].filter(cb => cb !== callback);
  };
}

/**
 * Establishes the WebSocket connection.
 * This should be called once when the application loads.
 */
export function connect() {
  if (socketClient && socketClient.readyState === WebSocket.OPEN) {
    console.log('WebSocket already connected.');
    return;
  }

  // Adjust the URL to your environment (e.g., using window.location.host)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/tournaments/ws`;
  console.log(`Connecting to WebSocket at ${wsUrl}`);
  
  socketClient = new WebSocket(wsUrl);

  socketClient.onopen = () => {
    console.log('WebSocket connection established.');
  };

  socketClient.onclose = () => {
    console.log('WebSocket connection closed. Attempting to reconnect...');
    socketClient = null;
    // Simple reconnect logic
    setTimeout(connect, 3000);
  };

  socketClient.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socketClient.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('[WS] Received:', message);

      if (message.type) {
        // Emit the message type as an event that the UI can subscribe to.
        emit(message.type, message.data || message);

        // Handle global error messages
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
}

/**
 * Sends a message through the WebSocket.
 * @param message The message object to send.
 */
function send(message: object) {
    if (!socketClient || socketClient.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected. Cannot send message:', message);
      return;
    }
    socketClient.send(JSON.stringify(message));
}

// --- Public API for UI components ---

/**
 * Sends a message to create a new tournament.
 * @param name The name of the tournament.
 * @param ownerId The ID of the user creating the tournament.
 */
export function createTournament(name: string, ownerId: number) {
  send({
    type: 'create_tournament',
    name: name,
    owner_id: ownerId,
  });
}

/**
 * Sends a message to delete a tournament.
 * @param name The name of the tournament to delete.
 * @param ownerId The ID of the user deleting the tournament.
 */
export function deleteTournament(name: string, owner_id: number) {
  send({ type: 'delete_tournament', name, owner_id });
}

export function toggleReadyStatus(tournament_id: number, user_id: number) {
  send({ type: 'toggle_ready_status', tournament_id, user_id });
}


/**
 * Requests the full details for a specific tournament.
 * The backend will respond with a 'tournament-update' message.
 * @param tournamentId The ID of the tournament.
 */
export function getTournamentDetails(tournamentId: number) {
  send({
    type: 'get_tournament_details',
    tournament_id: tournamentId,
  });
}

/**
 * Sends a message to join a tournament.
 * @param tournamentId The ID of the tournament to join.
 * @param userId The ID of the current user.
 */
export function joinTournament(tournamentId: number, userId: number) {
  send({
    type: 'join_tournament',
    tournament_id: tournamentId,
    user_id: userId,
  });
}

/**
 * Sends a message to leave a tournament.
 * @param tournamentId The ID of the tournament to leave.
 * @param userId The ID of the current user.
 * @param name The name of the tournament to leave.
 */
export function leaveTournament(tournamentId: number, userId: number, name: string) {
  send({
    type: 'leave_tournament',
    tournament_id: tournamentId,
    user_id: userId,
    name: name,
  });
}

/**
 * Sends a message to start a tournament.
 * @param name The name of the tournament to start.
 */
export function startTournament(name: string) {
  send({
    type: 'start_tournament',
    name: name,
  });
}

/**
 * Subscribes to real-time updates for a list of tournaments.
 * @param tournamentIds An array of tournament IDs.
 */
export function subscribeToTournaments(tournamentIds: number[]) {
    send({
        type: 'subscribe_to_tournaments',
        tournament_ids: tournamentIds
    });
}
