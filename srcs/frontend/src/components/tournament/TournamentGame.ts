// TournamentGame.ts
import show_brackets from '../../brackets/show_brackets';
import { detachCanvas, attachGameListeners, detachGameListeners } from '../game/GameController';
import { on } from '../../lib/socket';
import { navigate } from '../../lib/router';
import { getCurrentUserId } from '../auth/Auth';
import { joinGame as joinPvPGame } from '../game/GameController'; // Renaming for clarity

const tournamentGameModal = document.getElementById('tournament-game-modal') as HTMLElement;
const tournamentGameTitle = document.getElementById('tournament-game-title') as HTMLElement;
const tournamentMatchesList = document.getElementById('tournament-matches-list') as HTMLElement;
const tournamentBracketsContainer = document.getElementById('tournament-brackets-container') as HTMLElement;
const tournamentGameClose = document.getElementById('tournament-game-close') as HTMLButtonElement;

let currentTournamentId: number | null = null;
let isPlayingGame = false;

function joinTournamentGame(gameId: string) {
  isPlayingGame = true;
  // This will reuse the PvP join logic, which connects to the game's WebSocket
  // and handles the state updates. The backend will differentiate based on the message type.
  joinPvPGame(gameId, (state) => {
    const winnerSide = state.winner;
    const winner = state.players.find((p: any) => p.side === winnerSide);
    const resultPre = document.getElementById('game-result') as HTMLPreElement;
    resultPre.textContent = `Game Over — winner: ${winner ? winner.id : 'Unknown'}`;

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const forfeitBtn = document.getElementById('forfeit-btn') as HTMLButtonElement;
    canvas.classList.add('hidden');
    forfeitBtn.classList.add('hidden');
    resultPre.classList.remove('hidden');

    detachCanvas();
    tournamentGameModal.classList.remove('hidden');
    isPlayingGame = false;
  });
}

function displayRunningMatches(details: any) {
  console.log('[DisplayMatches] Received details:', details);
  if (!tournamentMatchesList) return;

  if (!details.brackets || !Array.isArray(details.brackets) || details.brackets.length === 0) {
    console.log('[DisplayMatches] No brackets found in details object.');
    tournamentMatchesList.innerHTML = '<p class="text-white text-center">No bracket data available.</p>';
    return;
  }

  // Find the first round that is not completely over
  const currentRound = details.brackets.find((round: any) =>
    round && round.matchs && round.matchs.some((match: any) => match.state !== 'OVER')
  );

  let runningMatches: any[] = [];
  if (currentRound) {
    // Filter for playable matches ONLY within the current round
    runningMatches = currentRound.matchs.filter((match: any) =>
      match && match.state !== 'OVER' && match.p1_id && match.p2_id
    );
    console.log(`[DisplayMatches] Current round is ${currentRound.round_nb}. Found ${runningMatches.length} playable matches.`);
  } else {
    console.log('[DisplayMatches] No current round found. All matches might be over.');
  }

  tournamentMatchesList.innerHTML = ''; // Clear previous matches

  if (runningMatches.length === 0) {
    if (!currentRound) {
      // This means all matches in all rounds are 'OVER'.
      console.log('[DisplayMatches] No pending matches found. Displaying "No matches running." message.');
      tournamentMatchesList.innerHTML = '<p class="text-white text-center">No matches are currently running.</p>';
    } else {
      // This means there's a current round, but the matches in it are not ready (e.g., waiting for a player).
      console.log('[DisplayMatches] Pending matches found in current round. Displaying "Waiting..." message.');
      tournamentMatchesList.innerHTML = '<p class="text-white text-center">Waiting for other matches to finish...</p>';
    }
    return;
  }

  console.log(`[DisplayMatches] Found ${runningMatches.length} playable matches. Rendering them now.`);
  const currentUserId = getCurrentUserId();
  for (const match of runningMatches) {
    const matchElement = document.createElement('div');
    matchElement.className = 'bg-gray-700 p-4 rounded-lg flex justify-between items-center';
    
    const isPlayer = currentUserId && (match.p1_id === currentUserId || match.p2_id === currentUserId);
    const buttonHtml = isPlayer
      ? `<button class="bg-green-500 text-white px-3 py-1 rounded join-game-btn" data-game-id="${match.id}" data-p1-id="${match.p1_id}" data-p2-id="${match.p2_id}">Join Game</button>`
      : ''; // If not a player, show no button

    matchElement.innerHTML = `
      <div class="text-white">
        <span class="font-bold">${match.p1_name || 'TBD'}</span> vs <span class="font-bold">${match.p2_name || 'TBD'}</span>
      </div>
      ${buttonHtml}
    `;
    tournamentMatchesList.appendChild(matchElement);
  }

  // Re-wire the event listener for the join button
  tournamentMatchesList.querySelectorAll('.join-game-btn').forEach(button => {
      button.addEventListener('click', (e) => {
          const gameId = (e.target as HTMLElement).dataset.gameId;
          if (gameId) {
            tournamentGameModal.classList.add('hidden');
            joinTournamentGame(gameId); // Join the specific game
          }
      });
  });
}

export function showTournamentGame(details: any) {
  console.log('[Tournament Redirection] showTournamentGame called with details:', details);
  if (tournamentGameModal) {
    tournamentGameModal.classList.remove('hidden');
  }
  attachGameListeners();

  currentTournamentId = details.id;
  
  console.log('Populating tournament game modal with details:', details);
  
  tournamentGameTitle.textContent = details.name;
  
  on('tournament-update', (newDetails) => {
    if (isPlayingGame) {
      console.log('Tournament update received, but a game is in progress. Ignoring.');
      return;
    }

    if (newDetails.id !== currentTournamentId) return;
    
    // Refresh the view with new data
    displayRunningMatches(newDetails);
    show_brackets(newDetails.id, tournamentBracketsContainer);
    
    if (newDetails.state === 'OVER') {
      console.log(`[DEBUG activeTournamentGame] TournamentGame.ts: 'tournament-update' listener - Tournament state is OVER for ID: ${newDetails.id}. Removing activeTournamentGame flag.`);
      localStorage.removeItem('activeTournamentGame');
      console.log(`[DEBUG activeTournamentGame] TournamentGame.ts: 'tournament-update' listener - activeTournamentGame flag REMOVED.`);
      const winnerDisplay = document.getElementById('tournament-winner-display') as HTMLElement;
      const winnerCloseBtn = document.getElementById('tournament-winner-close-btn') as HTMLButtonElement;

      if (winnerDisplay && winnerCloseBtn) {
        winnerDisplay.classList.remove('hidden');

        winnerCloseBtn.onclick = () => {
          winnerDisplay.classList.add('hidden');
          hideTournamentGame();
          navigate('home');
        };
      }
    }
  });

  // Initial render
  displayRunningMatches(details);
  show_brackets(details.id, tournamentBracketsContainer);
}

export function hideTournamentGame() {
  if (tournamentGameModal) {
    detachGameListeners();
    detachCanvas(); // Detach canvas FIRST
    tournamentGameModal.classList.add('hidden'); // Then hide the modal
    currentTournamentId = null;
    localStorage.removeItem('activeTournamentSession');
  }
}

export function isTournamentActive() {
  return currentTournamentId !== null;
}



