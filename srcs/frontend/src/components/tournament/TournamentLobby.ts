// TournamentLobby.ts
import { navigate } from '../../lib/router';
import { showTournamentGame } from './TournamentGame';
import { on, leaveTournament, startTournament, deleteTournament, getTournamentDetails } from '../../lib/socket';
import { getCurrentUserId } from '../auth/Auth';

const tournamentLobbyModal = document.getElementById('tournament-lobby-modal') as HTMLElement;
const tournamentLobbyClose = document.getElementById('tournament-lobby-close') as HTMLButtonElement;
const tournamentLobbyTitle = document.getElementById('tournament-lobby-title') as HTMLElement;
const tournamentLobbyState = document.getElementById('tournament-lobby-state') as HTMLElement;
const tournamentLobbyPlayerCount = document.getElementById('tournament-lobby-player-count') as HTMLElement;
const tournamentLobbyPlayers = document.getElementById('tournament-lobby-players') as HTMLTableSectionElement;
const leaveTournamentBtn = document.getElementById('tournament-lobby-leave-btn') as HTMLButtonElement;
const startTournamentBtn = document.getElementById('tournament-lobby-start-btn') as HTMLButtonElement;
const deleteTournamentBtn = document.getElementById('tournament-lobby-delete-btn') as HTMLButtonElement;

let currentTournamentId: number | null = null;
let currentTournamentName: string | null = null;
let currentTournamentDetails: any | null = null; // Cache for tournament data
let tournamentSocket: WebSocket | null = null;

function closeSocket() {
  if (tournamentSocket) {
    tournamentSocket.close();
    tournamentSocket = null;
  }
}

async function handleLeaveLobby() {
  const userId = getCurrentUserId();
  if (!userId) {
    alert('You must be logged in to perform this action.');
    return;
  }

  // If the user is the owner, confirm deletion. Otherwise, confirm leaving.
  if (currentTournamentDetails && userId === currentTournamentDetails.owner_id) {
    if (confirm(`As the owner, leaving will delete the tournament. Are you sure you want to delete "${currentTournamentName}"?`)) {
      deleteTournament(currentTournamentName!, userId);
      // The tournament-deleted message will handle closing the modal
    }
  } else {
    if (confirm('Leaving the lobby will remove you from the tournament. Are you sure?')) {
      if (!currentTournamentId || !currentTournamentName) return;
      leaveTournament(currentTournamentId, userId, currentTournamentName);
      
      // Hide the modal immediately for a responsive feel
      tournamentLobbyModal.classList.add('hidden');
      
      // Give the WebSocket message a moment to be sent before navigating
      setTimeout(() => {
        closeSocket();
        navigate('tournaments');
      }, 100);
    }
  }
}

let isLobbyInitialized = false;

function initializeLobbyEventListeners() {
  if (isLobbyInitialized) return;

  const leaveBtn = document.getElementById('tournament-lobby-leave-btn') as HTMLButtonElement;
  const startBtn = document.getElementById('tournament-lobby-start-btn') as HTMLButtonElement;
  const deleteBtn = document.getElementById('tournament-lobby-delete-btn') as HTMLButtonElement;
  const modal = document.getElementById('tournament-lobby-modal') as HTMLElement;
  const closeBtn = document.getElementById('tournament-lobby-close') as HTMLButtonElement;

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleLeaveLobby();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        handleLeaveLobby();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      handleLeaveLobby();
    }
  });

  if (leaveBtn) {
    leaveBtn.addEventListener('click', handleLeaveLobby);
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      if (!currentTournamentName) return;
      startTournament(currentTournamentName);
    });
  }

  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!currentTournamentName) return;
      if (confirm(`Are you sure you want to delete the tournament "${currentTournamentName}"?`)) {
        const ownerId = getCurrentUserId();
        if (!ownerId) {
          alert("You must be logged in to delete a tournament.");
          return;
        }
        deleteTournament(currentTournamentName, ownerId);
      }
    });
  }

  // This listener will now be active globally after the lobby has been initialized once
  on('tournament-deleted', (data) => {
    // If the deleted tournament is the one the user is currently viewing, show an alert and navigate
    if (data.tournament_id === currentTournamentId) {
      alert('The tournament has been deleted by the owner.');
      closeSocket();
      tournamentLobbyModal.classList.add('hidden');
      currentTournamentId = null; // Clear the current tournament ID
      navigate('home');
    }
  });

  isLobbyInitialized = true;
}

function renderLobby(details: any) {
  tournamentLobbyState.textContent = details.state;
  tournamentLobbyPlayerCount.textContent = `${details.nbr_players}/${details.max_players}`;

  // Update player list
  tournamentLobbyPlayers.innerHTML = '';
  if (details.players.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = 'No players have joined yet.';
    td.className = 'text-center py-4';
    tr.appendChild(td);
    tournamentLobbyPlayers.appendChild(tr);
  } else {
    details.players.forEach((player: any) => {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = player.name;
      nameTd.className = 'px-2 py-1';
      const readyTd = document.createElement('td');
      readyTd.textContent = '✅';
      readyTd.className = 'px-2 py-1';
      tr.appendChild(nameTd);
      tr.appendChild(readyTd);
      tournamentLobbyPlayers.appendChild(tr);
    });
  }

  // Show/hide owner controls and set button text
  const userId = getCurrentUserId();
  if (userId && userId === details.owner_id) {
    startTournamentBtn.classList.remove('hidden');
    leaveTournamentBtn.textContent = 'Delete Tournament';
    leaveTournamentBtn.classList.remove('hidden'); // Ensure it's visible
    deleteTournamentBtn.classList.add('hidden'); // Hide the old delete button
  } else {
    startTournamentBtn.classList.add('hidden');
    leaveTournamentBtn.textContent = 'Leave Tournament';
    leaveTournamentBtn.classList.remove('hidden'); // Ensure it's visible
    deleteTournamentBtn.classList.add('hidden'); // Hide the old delete button
  }
}

function updateLobby(details: any) {
  // Only update the parts of the lobby that can change
  tournamentLobbyState.textContent = details.state;
  tournamentLobbyPlayerCount.textContent = `${details.nbr_players}/${details.max_players}`;

  // Update player list
  tournamentLobbyPlayers.innerHTML = '';
  if (details.players.length === 0) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 2;
    td.textContent = 'No players have joined yet.';
    td.className = 'text-center py-4';
    tr.appendChild(td);
    tournamentLobbyPlayers.appendChild(tr);
  } else {
    details.players.forEach((player: any) => {
      const tr = document.createElement('tr');
      const nameTd = document.createElement('td');
      nameTd.textContent = player.name;
      nameTd.className = 'px-2 py-1';
      const readyTd = document.createElement('td');
      readyTd.textContent = '✅';
      readyTd.className = 'px-2 py-1';
      tr.appendChild(nameTd);
      tr.appendChild(readyTd);
      tournamentLobbyPlayers.appendChild(tr);
    });
  }
}

export async function showTournamentLobby(tournamentId: number, tournamentName: string) {
  // Ensure event listeners are attached
  initializeLobbyEventListeners();

  currentTournamentId = tournamentId;
  currentTournamentName = tournamentName;
  currentTournamentDetails = null; // Reset cache on new lobby


  tournamentLobbyTitle.textContent = `Lobby for ${tournamentName}`;
  tournamentLobbyPlayers.innerHTML = '<tr><td colspan="2" class="text-center py-4">Loading...</td></tr>';
  tournamentLobbyState.textContent = 'Loading...';
  tournamentLobbyPlayerCount.textContent = 'Loading...';
  startTournamentBtn.classList.add('hidden'); // Hide by default
  deleteTournamentBtn.classList.add('hidden'); // Hide by default
  leaveTournamentBtn.classList.remove('hidden'); // Show by default
  tournamentLobbyModal.classList.remove('hidden');

  // Listen for updates for this specific tournament
  on('tournament-update', (details) => {
    console.log('[Lobby] Received tournament-update:', details); // Log the entire object

    if (!details || details.id !== currentTournamentId) return; // Ensure it's the correct tournament
    
    const wasLoading = !currentTournamentDetails; // Check if this is the first data load
    currentTournamentDetails = details; // Cache the latest details

    // If we were in a loading state, now we can render the full lobby
    if (wasLoading) {
      renderLobby(details);
    } else {
      // Otherwise, just update the dynamic parts
      updateLobby(details);
    }

    // If the tournament has started, hide the lobby and show the game modal
    if (details.state === 'RUNNING' || details.state === 'OVER') {
        console.log(`[Lobby] Tournament state is '${details.state}'. Preparing to show game modal.`);
        const lobbyModal = document.getElementById('tournament-lobby-modal');
        const gameModal = document.getElementById('tournament-game-modal');

        if (lobbyModal) {
            console.log('[Lobby] Hiding lobby modal.');
            lobbyModal.classList.add('hidden');
        } else {
            console.error('[Lobby] Could not find lobby modal to hide.');
        }

        if (gameModal) {
            console.log('[Lobby] Calling showTournamentGame and showing game modal.');
            // Call showTournamentGame to populate the modal, then ensure it's visible.
            showTournamentGame(details);
            gameModal.classList.remove('hidden');
        } else {
            console.error('[Lobby] Could not find game modal to show.');
        }
    }
  });

  // Request the initial details
  getTournamentDetails(tournamentId);
}
