// TournamentLobby.ts
import { navigate } from '../../lib/router';
import { showTournamentGame } from './TournamentGame';
import { on, leaveTournament, startTournament, deleteTournament, getTournamentDetails, toggleReadyStatus } from '../../lib/socket';
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
const readyBtn = document.getElementById('tournament-lobby-ready-btn') as HTMLButtonElement;

let currentTournamentId: number | null = null;
let currentTournamentName: string | null = null;
let currentTournamentDetails: any | null = null; // Cache for tournament data
let tournamentSocket: WebSocket | null = null;

export function isTournamentLobbyActive() {
  return tournamentLobbyModal && !tournamentLobbyModal.classList.contains('hidden');
}

function closeSocket() {
  if (tournamentSocket) {
    tournamentSocket.close();
    tournamentSocket = null;
  }
}

export async function leaveTournamentLobby() {
  const userId = getCurrentUserId();
  if (!userId) {
    alert('You must be logged in to perform this action.');
    return;
  }

  if (currentTournamentDetails && userId === currentTournamentDetails.owner_id) {
    if (confirm(`As the owner, leaving will delete the tournament. Are you sure you want to delete "${currentTournamentName}"?`)) {
      deleteTournament(currentTournamentName!, userId);
    }
  } else {
    if (confirm('Are you sure you want to leave the tournament?')) {
      if (!currentTournamentId || !currentTournamentName) return;
      leaveTournament(currentTournamentId, userId, currentTournamentName);
    }
  }
}

let isLobbyInitialized = false;

function initializeLobbyEventListeners() {
  if (isLobbyInitialized) return;

  if (tournamentLobbyClose) {
    tournamentLobbyClose.addEventListener('click', (e) => {
      e.preventDefault();
      tournamentLobbyModal.classList.add('hidden');
      navigate('tournaments');
    });
  }

  if (tournamentLobbyModal) {
    tournamentLobbyModal.addEventListener('click', (e) => {
      if (e.target === tournamentLobbyModal) {
        tournamentLobbyModal.classList.add('hidden');
        navigate('tournaments');
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tournamentLobbyModal && !tournamentLobbyModal.classList.contains('hidden')) {
      tournamentLobbyModal.classList.add('hidden');
      navigate('tournaments');
    }
  });

  if (leaveTournamentBtn) {
    leaveTournamentBtn.addEventListener('click', leaveTournamentLobby);
  }

  if (startTournamentBtn) {
    startTournamentBtn.addEventListener('click', () => {
      if (!currentTournamentName) return;
      startTournament(currentTournamentName);
    });
  }

  if (deleteTournamentBtn) {
    deleteTournamentBtn.addEventListener('click', () => {
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

  if (readyBtn) {
    readyBtn.addEventListener('click', () => {
      const userId = getCurrentUserId();
      if (!currentTournamentId || !userId) return;
      toggleReadyStatus(currentTournamentId, userId);
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
      localStorage.removeItem('activeTournamentSession');
      navigate('home');
    }
  });

  on('left-tournament', (data) => {
    if (data.userId === getCurrentUserId()) {
      closeSocket();
      tournamentLobbyModal.classList.add('hidden');
      currentTournamentId = null;
      localStorage.removeItem('activeTournamentSession');
      navigate('tournaments');
    }
  });

  isLobbyInitialized = true;
}

function renderLobby(details: any) {
  const userId = getCurrentUserId();
  const isOwner = userId && userId === details.owner_id;
  const allPlayersReady = details.players.every((p: any) => p.is_ready);
  const canStart = details.nbr_players >= details.min_players && allPlayersReady;

  // --- DEBUG LOG ---
  console.log({
    message: "[Lobby Render] Status Check",
    isOwner,
    playerCount: details.nbr_players,
    minPlayers: details.min_players,
    allPlayersReady,
    canStart,
    players: details.players,
  });
  // --- END DEBUG LOG ---

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
      readyTd.textContent = player.is_ready ? '✅' : '❌';
      readyTd.className = 'px-2 py-1';
      tr.appendChild(nameTd);
      tr.appendChild(readyTd);
      tournamentLobbyPlayers.appendChild(tr);
    });
  }

  // Show/hide owner controls and set button text
  if (isOwner) {
    startTournamentBtn.classList.remove('hidden');
    startTournamentBtn.disabled = !canStart;
    leaveTournamentBtn.textContent = 'Delete Tournament';
    leaveTournamentBtn.classList.remove('hidden');
    deleteTournamentBtn.classList.add('hidden');
    readyBtn.classList.add('hidden'); // Hide ready button for owner

    // Update Start button style based on whether it's enabled
    if (startTournamentBtn.disabled) {
      startTournamentBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
      startTournamentBtn.classList.add('bg-gray-500', 'cursor-not-allowed');
    } else {
      startTournamentBtn.classList.add('bg-green-600', 'hover:bg-green-700');
      startTournamentBtn.classList.remove('bg-gray-500', 'cursor-not-allowed');
    }
  } else {
    startTournamentBtn.classList.add('hidden');
    leaveTournamentBtn.textContent = 'Leave Tournament';
    leaveTournamentBtn.classList.remove('hidden');
    deleteTournamentBtn.classList.add('hidden');
    readyBtn.classList.remove('hidden'); // Show ready button for other players
  }

  // Update Ready button text
  const currentUser = details.players.find((p: any) => p.id === userId);
  if (currentUser) {
    readyBtn.textContent = currentUser.is_ready ? 'Not Ready' : 'Ready';
    readyBtn.classList.remove(currentUser.is_ready ? 'bg-purple-600' : 'bg-green-600');
    readyBtn.classList.add(currentUser.is_ready ? 'bg-green-600' : 'bg-purple-600');
  }
}

export async function showTournamentLobby(tournamentId: number, tournamentName: string) {
  // Ensure event listeners are attached
  initializeLobbyEventListeners();

  currentTournamentId = tournamentId;
  currentTournamentName = tournamentName;
  currentTournamentDetails = null; // Reset cache on new lobby
  localStorage.setItem('activeTournamentSession', JSON.stringify({ tournamentId, tournamentName }));


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
    if (!details || details.id !== currentTournamentId) return;
    
    currentTournamentDetails = details;
    renderLobby(details);

    // If the tournament has started, hide the lobby and show the game modal
    if (details.state === 'RUNNING' || details.state === 'OVER') {
        if (details.state === 'RUNNING') {
            localStorage.setItem('activeTournamentGame', JSON.stringify({ id: details.id }));
        }
        const lobbyModal = document.getElementById('tournament-lobby-modal');
        const gameModal = document.getElementById('tournament-game-modal');

        if (lobbyModal) {
            lobbyModal.classList.add('hidden');
        }

        if (gameModal) {
            showTournamentGame(details);
            gameModal.classList.remove('hidden');
        }
    }
  });

  // Request the initial details
  getTournamentDetails(tournamentId);
}