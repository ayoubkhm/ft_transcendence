// TournamentGame.ts
import show_brackets from '../../brackets/show_brackets';
import { pollGame, detachCanvas } from '../game/GameController';
import { on } from '../../lib/socket';
import { navigate } from '../../lib/router';
import { getCurrentUserId } from '../auth/Auth';

const tournamentGameModal = document.getElementById('tournament-game-modal') as HTMLElement;
const tournamentGameTitle = document.getElementById('tournament-game-title') as HTMLElement;
const tournamentMatchesList = document.getElementById('tournament-matches-list') as HTMLElement;
const tournamentBracketsContainer = document.getElementById('tournament-brackets-container') as HTMLElement;
const tournamentGameClose = document.getElementById('tournament-game-close') as HTMLButtonElement;

let currentTournamentId: number | null = null;

function displayRunningMatches(details: any) {
  console.log('[Game] displayRunningMatches received details:', details);
  if (!tournamentMatchesList) return;

  // 1. Robustly check for bracket data.
  if (!details.brackets || !Array.isArray(details.brackets)) {
    console.log('[Game] No brackets found in details object.');
    tournamentMatchesList.innerHTML = '<p class="text-white text-center">No bracket data available.</p>';
    return;
  }

  // 2. Safely flatten all matches from all rounds into a single array.
  const allMatches = details.brackets.flatMap((round: any) => (round && round.matchs ? round.matchs : []));
  console.log('[Game] Flattened allMatches:', allMatches);

  // 3. Filter for only the matches that are currently active using the correct properties.
  const runningMatches = allMatches.filter((match: any) => match && match.state !== 'OVER' && match.p1_id && match.p2_id);
  console.log('[Game] Filtered runningMatches:', runningMatches);

  tournamentMatchesList.innerHTML = ''; // Clear previous matches

  if (runningMatches.length === 0) {
    console.log('[Game] No running matches found. Displaying message.');
    tournamentMatchesList.innerHTML = '<p class="text-white text-center">No matches are currently running.</p>';
    return;
  }

  const currentUserId = getCurrentUserId();
  for (const match of runningMatches) {
    const matchElement = document.createElement('div');
    matchElement.className = 'bg-gray-700 p-4 rounded-lg flex justify-between items-center';
    
    // Use the correct properties for checking player and rendering
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
          // This logic to start a game via fetch is complex and seems to be part of the game_service, not tournament_service.
          // For now, we will assume it's out of scope of the current WebSocket refactor.
          // If this also needs to be converted, it would be a separate step.
          alert("Joining game... (functionality to be confirmed)");
      });
  });
}

export function showTournamentGame(details: any) {
  currentTournamentId = details.id;
  
  console.log('Populating tournament game modal with details:', details);
  
  tournamentGameTitle.textContent = details.name;
  
  on('tournament-update', (updatedDetails) => {
    if (updatedDetails.data.id !== currentTournamentId) return;
    const newDetails = updatedDetails.data;
    // Refresh the view with new data
    displayRunningMatches(newDetails);
    show_brackets(newDetails.id, tournamentBracketsContainer);
    if (newDetails.state === 'OVER' && newDetails.winner_name) {
      alert(`Tournament Over! Winner: ${newDetails.winner_name}`);
      hideTournamentGame();
      navigate('home');
    }
  });

  // Initial render
  displayRunningMatches(details);
  show_brackets(details.id, tournamentBracketsContainer);
}

export function hideTournamentGame() {
  if (tournamentGameModal) {
    detachCanvas(); // Detach canvas FIRST
    tournamentGameModal.classList.add('hidden'); // Then hide the modal
    currentTournamentId = null;
  }
}

if (tournamentGameClose) {
  tournamentGameClose.addEventListener('click', hideTournamentGame);
}
