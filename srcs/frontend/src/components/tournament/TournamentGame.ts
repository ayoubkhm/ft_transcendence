// TournamentGame.ts
import show_brackets from '../../brackets/show_brackets';
import { pollGame, detachCanvas } from '../game/GameController';

const tournamentGameModal = document.getElementById('tournament-game-modal') as HTMLElement;
const tournamentGameTitle = document.getElementById('tournament-game-title') as HTMLElement;
const tournamentMatchesList = document.getElementById('tournament-matches-list') as HTMLElement;
const tournamentBracketsContainer = document.getElementById('tournament-brackets-container') as HTMLElement;
const tournamentGameClose = document.getElementById('tournament-game-close') as HTMLButtonElement;

let tournamentId: number | null = null;
let tournamentSocket: WebSocket | null = null;

function closeSocket() {
  if (tournamentSocket) {
    tournamentSocket.close();
    tournamentSocket = null;
  }
}

async function fetchAndDisplayRunningMatches(id: number, currentUserId: number | null) {
  if (!tournamentMatchesList) return;
  try {
    const res = await fetch(`/api/tournaments/${id}/running_matches`);
    if (!res.ok) {
      throw new Error('Failed to fetch running matches');
    }
    const matches = await res.json();

    tournamentMatchesList.innerHTML = ''; // Clear previous matches
    if (matches.length === 0) {
      tournamentMatchesList.innerHTML = '<p class="text-white text-center">No matches are currently running.</p>';
      return;
    }

    for (const match of matches) {
      const matchElement = document.createElement('div');
      matchElement.className = 'bg-gray-700 p-4 rounded-lg flex justify-between items-center';
      
      const isPlayer = currentUserId && (match.p1_id === currentUserId || match.p2_id === currentUserId);
      const buttonHtml = isPlayer
        ? `<button class="bg-green-500 text-white px-3 py-1 rounded join-game-btn" data-game-id="${match.id}" data-p1-id="${match.p1_id}" data-p2-id="${match.p2_id}">Join Game</button>`
        : `<button class="bg-blue-500 text-white px-3 py-1 rounded spectate-btn" data-game-id="${match.id}">Spectate</button>`;

      matchElement.innerHTML = `
        <div class="text-white">
          <span class="font-bold">${match.p1_name || 'TBD'}</span> vs <span class="font-bold">${match.p2_name || 'TBD'}</span>
        </div>
        ${buttonHtml}
      `;
      tournamentMatchesList.appendChild(matchElement);
    }

    // Add event listeners for the new buttons
    tournamentMatchesList.querySelectorAll('.join-game-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const target = e.target as HTMLElement;
            const gameId = target.dataset.gameId;
            const p1Id = target.dataset.p1Id;
            const p2Id = target.dataset.p2Id;

            if (gameId) {
                try {
                    const res = await fetch(`/api/game/${gameId}/start`, { method: 'POST' });
                    if (!res.ok) throw new Error('Failed to start game on backend');
                    
                    const { p1Token, p2Token } = await res.json();
                    const userId = localStorage.getItem('userId');

                    // Determine which token belongs to the current user and save it
                    if (userId === p1Id) {
                        localStorage.setItem('authToken', p1Token);
                    } else if (userId === p2Id) {
                        localStorage.setItem('authToken', p2Token);
                    }

                    // Set flags to indicate a tournament game is active
                    localStorage.setItem('currentGameType', 'tournament');
                    localStorage.setItem('currentTournamentId', tournamentId!.toString());

                    hideTournamentGame();
                    pollGame(gameId);
                } catch (err) {
                    console.error("Failed to start and join tournament game:", err);
                    alert("Could not join the game. Please try again.");
                }
            }
        });
    });

    tournamentMatchesList.querySelectorAll('.spectate-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const gameId = (e.target as HTMLElement).dataset.gameId;
            if (gameId) {
                // Logic for spectating
                console.log(`Spectating game ${gameId}`);
            }
        });
    });

  } catch (err) {
    console.error('Error fetching running matches:', err);
    tournamentMatchesList.innerHTML = '<p class="text-white text-center text-red-500">Error loading matches.</p>';
  }
}

export async function showTournamentGame(id: number) {
  tournamentId = id;
  if (tournamentGameModal) {
    tournamentGameModal.classList.remove('hidden');
    
    // Establish WebSocket connection
    closeSocket(); // Close any existing socket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/tournaments/${id}/ws`;
    tournamentSocket = new WebSocket(wsUrl);

    tournamentSocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'bracket_update') {
        // Refresh the view
        showTournamentGame(id);
      } else if (message.type === 'tournament-winner') {
        alert(`Tournament Over! Winner: ${message.winner.name}`);
        hideTournamentGame();
        navigate('home');
      }
    };

    // Fetch the tournament name and display it
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (res.ok) {
        const data = await res.json();
        tournamentGameTitle.textContent = data.name;
      }
    } catch (err) {
      console.error('Error fetching tournament details:', err);
    }

    // Render the brackets into its container
    show_brackets(id, tournamentBracketsContainer);

    const userId = localStorage.getItem('userId');
    // Fetch and display the running matches from the new endpoint
    await fetchAndDisplayRunningMatches(id, userId ? parseInt(userId, 10) : null);
  }
}

export function hideTournamentGame() {
  if (tournamentGameModal) {
    detachCanvas(); // Detach canvas FIRST
    tournamentGameModal.classList.add('hidden'); // Then hide the modal
    closeSocket();
  }
}

if (tournamentGameClose) {
  tournamentGameClose.addEventListener('click', hideTournamentGame);
}
