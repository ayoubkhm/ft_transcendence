// TournamentGame.ts
import show_brackets from '../../brackets/show_brackets';
import {
  detachCanvas,
  attachGameListeners,
  detachGameListeners,
  joinGame as joinPvPGame,
} from '../game/GameController';
import { on } from '../../lib/socket';
import { navigate } from '../../lib/router';
import { getCurrentUserId } from '../auth/Auth';

// ─── DOM refs ──────────────────────────────────────────────
const tournamentGameModal = document.getElementById('tournament-game-modal') as HTMLElement;
const tournamentGameTitle = document.getElementById('tournament-game-title') as HTMLElement;
const tournamentMatchesList = document.getElementById('tournament-matches-list') as HTMLElement;
const tournamentBracketsContainer = document.getElementById('tournament-brackets-container') as HTMLElement;
const tournamentGameClose = document.getElementById('tournament-game-close') as HTMLButtonElement;

// ─── Types minimalistes ────────────────────────────────────
type Match = {
  id: number;
  state: 'PENDING' | 'RUNNING' | 'OVER';
  p1_id?: number;
  p2_id?: number;
  p1_name?: string;
  p2_name?: string;
};

type Round = {
  round_nb: number;
  matchs: Match[];
};

type TournamentDetails = {
  id: number;
  name: string;
  state: 'RUNNING' | 'OVER' | 'WAITING';
  brackets: Round[];
};

let currentTournamentId: number | null = null;
let isPlayingGame = false;
let offTournamentUpdate: (() => void) | null = null; // To hold the unsubscribe function
let pendingDetails: TournamentDetails | null = null;

// ─── Utils ────────────────────────────────────────────────
function isModalHidden() {
  return tournamentGameModal?.classList.contains('hidden');
}

function render(details: TournamentDetails) {
  displayRunningMatches(details);
  show_brackets(details.id, tournamentBracketsContainer);
}

function flushPendingIfAny() {
  if (pendingDetails && !isPlayingGame && !isModalHidden()) {
    console.log('[Tournament] Flushing buffered update');
    render(pendingDetails);
    pendingDetails = null;
  }
}

// ─── Socket subscription management ───────────────────────
function subscribeTournamentUpdates(tournamentId: number) {
  // Clean old handler if any
  if (offTournamentUpdate) {
    offTournamentUpdate();
    offTournamentUpdate = null;
  }

  const handler = (newDetails: TournamentDetails) => {
    if (newDetails.id !== currentTournamentId) return;

    if (isPlayingGame || isModalHidden()) {
      console.log('[Tournament] Update received but ignored/buffered (playing or hidden).');
      pendingDetails = newDetails;
      return;
    }

    render(newDetails);

    if (newDetails.state === 'OVER') {
      console.log('[Tournament] OVER → clean & show winner');
      localStorage.removeItem('activeTournamentGame');

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
  };

  offTournamentUpdate = on('tournament-update', handler);
}

// ─── Game join logic ──────────────────────────────────────
function joinTournamentGame(gameId: string) {
  isPlayingGame = true;

  joinPvPGame(gameId, (state: any) => {
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
    flushPendingIfAny(); // On rerend si des updates étaient en attente
  });
}

// ─── UI rendering ─────────────────────────────────────────
function displayRunningMatches(details: TournamentDetails) {
  if (!tournamentMatchesList) return;

  if (!details.brackets || !Array.isArray(details.brackets) || details.brackets.length === 0) {
    tournamentMatchesList.innerHTML = '<p class="text-white text-center">No bracket data available.</p>';
    return;
  }

  // First round not fully OVER
  const currentRound = details.brackets.find(
    (round) => round?.matchs?.some((m) => m.state !== 'OVER')
  );

  let runningMatches: Match[] = [];
  if (currentRound) {
    runningMatches = currentRound.matchs.filter(
      (m) => m && m.state !== 'OVER' && m.p1_id && m.p2_id
    );
    console.log(
      `[DisplayMatches] Current round is ${currentRound.round_nb}. Found ${runningMatches.length} playable matches.`
    );
  } else {
    console.log('[DisplayMatches] No current round found. All matches might be over.');
  }

  tournamentMatchesList.innerHTML = '';

  if (runningMatches.length === 0) {
    if (!currentRound) {
      tournamentMatchesList.innerHTML = '<p class="text-white text-center">No matches are currently running.</p>';
    } else {
      tournamentMatchesList.innerHTML = '<p class="text-white text-center">Waiting for other matches to finish...</p>';
    }
    return;
  }

  const currentUserId = getCurrentUserId();
  const frag = document.createDocumentFragment();

  for (const match of runningMatches) {
    const matchElement = document.createElement('div');
    matchElement.className = 'bg-gray-700 p-4 rounded-lg flex justify-between items-center';

    const isPlayer = currentUserId && (match.p1_id === currentUserId || match.p2_id === currentUserId);
    const btn = isPlayer
      ? `<button class="bg-green-500 text-white px-3 py-1 rounded join-game-btn" data-game-id="${match.id}">Join Game</button>`
      : '';

    matchElement.innerHTML = `
      <div class="text-white">
        <span class="font-bold">${match.p1_name || 'TBD'}</span> vs <span class="font-bold">${match.p2_name || 'TBD'}</span>
      </div>
      ${btn}
    `;
    frag.appendChild(matchElement);
  }

  tournamentMatchesList.appendChild(frag);
}

// Event delegation for join buttons
if (tournamentMatchesList) {
  tournamentMatchesList.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const btn = target.closest('.join-game-btn') as HTMLElement | null;
    if (!btn) return;

    const gameId = btn.dataset.gameId;
    if (!gameId) return;

    tournamentGameModal.classList.add('hidden');
    joinTournamentGame(gameId);
  });
}

// ─── Public API ───────────────────────────────────────────
export function showTournamentGame(details: TournamentDetails) {
  console.log('[Tournament] showTournamentGame', details);

  if (tournamentGameModal) {
    tournamentGameModal.classList.remove('hidden');
  }
  attachGameListeners();

  currentTournamentId = details.id;
  tournamentGameTitle.textContent = details.name;

  subscribeTournamentUpdates(details.id);

  // Initial render
  render(details);
}

export function hideTournamentGame() {
  if (!tournamentGameModal) return;

  detachGameListeners();
  detachCanvas();
  tournamentGameModal.classList.add('hidden');

  // Unsubscribe
  if (offTournamentUpdate) {
    offTournamentUpdate();
    offTournamentUpdate = null;
  }

  currentTournamentId = null;
  pendingDetails = null;
  localStorage.removeItem('activeTournamentSession');
  localStorage.removeItem('activeTournamentGame');
}

export function isTournamentActive() {
  return currentTournamentId !== null;
}
