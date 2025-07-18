// TournamentLobby.ts
import { navigate } from '../../lib/router';
import { showTournamentGame } from './TournamentGame';

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
let tournamentSocket: WebSocket | null = null;

function closeSocket() {
  if (tournamentSocket) {
    tournamentSocket.close();
    tournamentSocket = null;
  }
}

async function handleLeaveLobby() {
  if (confirm('Leaving the lobby will remove you from the tournament. Are you sure?')) {
    if (!currentTournamentName) return;

    const email = localStorage.getItem('userEmail');
    if (!email) {
      alert('You must be logged in to leave a tournament.');
      return;
    }

    let userId;
    try {
      const lookupRes = await fetch(`/api/user/lookup/${encodeURIComponent(email)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!lookupRes.ok) throw new Error('User lookup failed');
      const userData = await lookupRes.json();
      userId = userData.id;
    } catch (err) {
      console.error('Error looking up user:', err);
      alert('Could not verify your user ID.');
      return;
    }

    try {
      const res = await fetch(`/api/tournaments/${currentTournamentName}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });

      if (res.ok) {
        closeSocket();
        tournamentLobbyModal.classList.add('hidden');
        navigate('tournaments');
      } else {
        const err = await res.json();
        alert(`Failed to leave tournament: ${err.error || err.msg}`);
      }
    } catch (err) {
      console.error('Leave tournament error:', err);
      alert('An error occurred while trying to leave the tournament.');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tournamentLobbyModal = document.getElementById('tournament-lobby-modal') as HTMLElement;
  const tournamentLobbyClose = document.getElementById('tournament-lobby-close') as HTMLButtonElement;
  const leaveTournamentBtn = document.getElementById('tournament-lobby-leave-btn') as HTMLButtonElement;
  const startTournamentBtn = document.getElementById('tournament-lobby-start-btn') as HTMLButtonElement;
  const deleteTournamentBtn = document.getElementById('tournament-lobby-delete-btn') as HTMLButtonElement;

  if (tournamentLobbyClose) {
    tournamentLobbyClose.addEventListener('click', (e) => {
      e.preventDefault();
      handleLeaveLobby();
    });
  }

  if (tournamentLobbyModal) {
    tournamentLobbyModal.addEventListener('click', (e) => {
      if (e.target === tournamentLobbyModal) {
        handleLeaveLobby();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && tournamentLobbyModal && !tournamentLobbyModal.classList.contains('hidden')) {
      handleLeaveLobby();
    }
  });

  if (leaveTournamentBtn) {
    leaveTournamentBtn.addEventListener('click', handleLeaveLobby);
  }

  if (startTournamentBtn) {
    startTournamentBtn.addEventListener('click', async () => {
      if (!currentTournamentName || !currentTournamentId) return;

      try {
        const res = await fetch(`/api/tournaments/${currentTournamentName}/start`, {
          method: 'POST',
          credentials: 'include',
        });

        if (res.ok) {
          // Hide the lobby modal
          if (tournamentLobbyModal) {
            tournamentLobbyModal.classList.add('hidden');
          }
          // Show the tournament game modal
          showTournamentGame(currentTournamentId);
        } else {
          const err = await res.json();
          alert(`Failed to start tournament: ${err.error || err.msg}`);
        }
      } catch (err) {
        console.error('Start tournament error:', err);
        alert('An error occurred while trying to start the tournament.');
      }
    });
  }

  if (deleteTournamentBtn) {
    deleteTournamentBtn.addEventListener('click', async () => {
      if (!currentTournamentName) return;

      if (confirm(`Are you sure you want to delete the tournament "${currentTournamentName}"?`)) {
        try {
          const res = await fetch(`/api/tournaments/${currentTournamentName}`, {
            method: 'DELETE',
            credentials: 'include',
          });

          if (res.ok) {
            // Deletion was successful, close the modal for the owner.
            // Other clients will be notified by the WebSocket message.
            closeSocket();
            tournamentLobbyModal?.classList.add('hidden');
            navigate('home');
          } else {
            const err = await res.json();
            alert(`Failed to delete tournament: ${err.error || err.msg}`);
          }
        } catch (err) {
          console.error('Delete tournament error:', err);
          alert('An error occurred while trying to delete the tournament.');
        }
      }
    });
  }
});

export async function showTournamentLobby(tournamentId: number, tournamentName: string) {
  currentTournamentId = tournamentId;
  currentTournamentName = tournamentName;

  tournamentLobbyTitle.textContent = `Lobby for ${tournamentName}`;
  tournamentLobbyPlayers.innerHTML = '<tr><td colspan="2" class="text-center py-4">Loading...</td></tr>';
  tournamentLobbyState.textContent = 'Loading...';
  tournamentLobbyPlayerCount.textContent = 'Loading...';
  startTournamentBtn.classList.add('hidden'); // Hide by default
  deleteTournamentBtn.classList.add('hidden'); // Hide by default
  leaveTournamentBtn.classList.remove('hidden'); // Show by default
  tournamentLobbyModal.classList.remove('hidden');

  // Establish WebSocket connection
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${wsProtocol}//${window.location.host}/api/tournaments/${tournamentId}/ws`;
  tournamentSocket = new WebSocket(wsUrl);

  tournamentSocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === 'tournament-deleted') {
      alert('The tournament has been deleted by the owner.');
      closeSocket();
      tournamentLobbyModal.classList.add('hidden');
      navigate('home');
    }
  };

  tournamentSocket.onclose = () => {
    console.log('Tournament WebSocket closed.');
  };

  tournamentSocket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  try {
    const detailsRes = await fetch(`/api/tournaments/${tournamentId}`, { credentials: 'include' });

    if (!detailsRes.ok) {
      throw new Error('Failed to fetch tournament data');
    }

    const details = await detailsRes.json();

    tournamentLobbyState.textContent = details.state;
    tournamentLobbyPlayerCount.textContent = `${details.nbr_players}/${details.max_players}`;

    const email = localStorage.getItem('userEmail');
    if (email) {
      const lookupRes = await fetch(`/api/user/lookup/${encodeURIComponent(email)}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (lookupRes.ok) {
        const userData = await lookupRes.json();
        if (userData.id === details.owner_id) {
          startTournamentBtn.classList.remove('hidden');
          deleteTournamentBtn.classList.remove('hidden');
          leaveTournamentBtn.classList.add('hidden');
        }
      }
    }

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
  } catch (err) {
    console.error('Error fetching lobby data:', err);
    tournamentLobbyPlayers.innerHTML = '<tr><td colspan="2" class="text-center py-4 text-red-500">Error loading players.</td></tr>';
    tournamentLobbyState.textContent = 'Error';
    tournamentLobbyPlayerCount.textContent = 'Error';
  }
}
