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

export function isTournamentLobbyActive() {
  return tournamentLobbyModal && !tournamentLobbyModal.classList.contains('hidden');
}

// This function is for the dedicated "Leave/Delete" button and includes a confirmation.
// It is also called by the router's popstate handler.
export function leaveTournamentLobby() {
  const userId = getCurrentUserId();
  if (!userId) {
    alert('You must be logged in to perform this action.');
    return false; // Indicate failure
  }

  let didLeave = false;
  if (currentTournamentDetails && userId === currentTournamentDetails.owner_id) {
    if (confirm(`As the owner, leaving will delete the tournament. Are you sure you want to delete "${currentTournamentName}"?`)) {
      deleteTournament(currentTournamentName!, userId);
      didLeave = true;
    }
  } else {
    if (confirm('Are you sure you want to leave the tournament?')) {
      if (!currentTournamentId || !currentTournamentName) return false;
      navigate('tournaments');
      tournamentLobbyModal.classList.add('hidden');
      leaveTournament(currentTournamentId, userId, currentTournamentName);
      didLeave = true;
    }
  }

  if (didLeave) {
    console.log("[DEBUG activeTournamentSession] leaveTournamentLobby() - User confirmed leave. Removing activeTournamentSession flag.");
    localStorage.removeItem('activeTournamentSession');
    console.log("[DEBUG activeTournamentSession] leaveTournamentLobby() - activeTournamentSession flag REMOVED.");
  }
  return didLeave; // Return whether the user confirmed the action
}

let isLobbyInitialized = false;

function initializeLobbyEventListeners() {
  if (isLobbyInitialized) return;

  // All close actions will now navigate to 'tournaments', which will trigger the popstate listener in the router.
  const navigateToTournaments = (e: Event) => {
    e.preventDefault();
    navigate('tournaments');
  };

  if (tournamentLobbyClose) {
    tournamentLobbyClose.addEventListener('click', navigateToTournaments);
  }

  if (tournamentLobbyModal) {
    tournamentLobbyModal.addEventListener('click', (e) => {
      if (e.target === tournamentLobbyModal) {
        navigateToTournaments(e);
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isTournamentLobbyActive()) {
      navigateToTournaments(e);
    }
  });

  // The dedicated button still uses the function with the confirmation dialog directly
  if (leaveTournamentBtn) {
    leaveTournamentBtn.addEventListener('click', () => {
        if (leaveTournamentLobby()) {
            tournamentLobbyModal.classList.add('hidden');
            navigate('tournaments');
        }
    });
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
    if (data.tournament_id === currentTournamentId) {
      alert('The tournament has been deleted by the owner.');
      tournamentLobbyModal.classList.add('hidden');
      console.log("[DEBUG activeTournamentSession] TournamentLobby.ts: 'tournament-deleted' listener - Removing activeTournamentSession flag.");
      localStorage.removeItem('activeTournamentSession');
      console.log("[DEBUG activeTournamentSession] TournamentLobby.ts: 'tournament-deleted' listener - activeTournamentSession flag REMOVED.");
      currentTournamentId = null;
      navigate('home');
    }
  });

  on('left-tournament', (data) => {
    if (data.userId === getCurrentUserId()) {
      tournamentLobbyModal.classList.add('hidden');
      console.log("[DEBUG activeTournamentSession] TournamentLobby.ts: 'left-tournament' listener - Removing activeTournamentSession flag.");
      localStorage.removeItem('activeTournamentSession');
      console.log("[DEBUG activeTournamentSession] TournamentLobby.ts: 'left-tournament' listener - activeTournamentSession flag REMOVED.");
      currentTournamentId = null;
      
    }
  });

  window.addEventListener('beforeunload', () => {
    const userId = getCurrentUserId();
    if (isTournamentLobbyActive() && currentTournamentDetails && userId === currentTournamentDetails.owner_id) {
      deleteTournament(currentTournamentName!, userId);
    }
  });

  isLobbyInitialized = true;
}

function renderLobby(details: any) {
  const userId = getCurrentUserId();
  const isOwner = userId && userId === details.owner_id;
  const allPlayersReady = details.players.every((p: any) => p.is_ready);
  const canStart = details.nbr_players >= details.min_players && allPlayersReady;

  currentTournamentDetails = details; // Cache details for use in leave functions

  tournamentLobbyState.textContent = details.state;
  tournamentLobbyPlayerCount.textContent = `${details.nbr_players}/${details.max_players}`;

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

  if (isOwner) {
    startTournamentBtn.classList.remove('hidden');
    startTournamentBtn.disabled = !canStart;
    leaveTournamentBtn.textContent = 'Delete Tournament';
    leaveTournamentBtn.classList.remove('hidden');
    deleteTournamentBtn.classList.add('hidden');
    readyBtn.classList.add('hidden');

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
    readyBtn.classList.remove('hidden');
  }

  const currentUser = details.players.find((p: any) => p.id === userId);
  if (currentUser) {
    readyBtn.textContent = currentUser.is_ready ? 'Not Ready' : 'Ready';
    readyBtn.classList.remove(currentUser.is_ready ? 'bg-purple-600' : 'bg-green-600');
    readyBtn.classList.add(currentUser.is_ready ? 'bg-green-600' : 'bg-purple-600');
  }
}

export async function showTournamentLobby(tournamentId: number, tournamentName: string) {
  document.getElementById('tournament-lobby-close')?.remove();
  initializeLobbyEventListeners();

  currentTournamentId = tournamentId;
  currentTournamentName = tournamentName;
  currentTournamentDetails = null;
  console.log(`[DEBUG activeTournamentSession] TournamentLobby.ts: showTournamentLobby() - Setting activeTournamentSession flag for tournamentId: ${tournamentId}, tournamentName: ${tournamentName}`);
  localStorage.setItem('activeTournamentSession', JSON.stringify({ tournamentId, tournamentName }));
  console.log("[DEBUG activeTournamentSession] TournamentLobby.ts: showTournamentLobby() - activeTournamentSession flag SET.");

  tournamentLobbyTitle.textContent = `Lobby for ${tournamentName}`;
  tournamentLobbyPlayers.innerHTML = '<tr><td colspan="2" class="text-center py-4">Loading...</td></tr>';
  tournamentLobbyState.textContent = 'Loading...';
  tournamentLobbyPlayerCount.textContent = 'Loading...';
  startTournamentBtn.classList.add('hidden');
  deleteTournamentBtn.classList.add('hidden');
  leaveTournamentBtn.classList.remove('hidden');
  tournamentLobbyModal.classList.remove('hidden');

  const unsubscribe = on('tournament-update', (details) => {
    if (!details || details.id !== currentTournamentId) return;
    
    currentTournamentDetails = details;
    renderLobby(details);

    if (details.state === 'RUNNING' || details.state === 'OVER') {
        // This listener has done its job. Unsubscribe to prevent it from ever running again.
        unsubscribe();

        if (details.state === 'RUNNING') {
            console.log(`[DEBUG] TournamentLobby.ts: Tournament state is RUNNING. Setting activeTournamentGame flag for ID: ${details.id} and navigating.`);
            localStorage.setItem('activeTournamentGame', JSON.stringify({ id: details.id }));
            
            const lobbyModal = document.getElementById('tournament-lobby-modal');
            if (lobbyModal) {
                lobbyModal.classList.add('hidden');
            }
    
            // Navigate to the tournament game view, letting the router handle the state transition.
            navigate('tournament', { id: details.id });
        }
    }
  });

  getTournamentDetails(tournamentId);
}
