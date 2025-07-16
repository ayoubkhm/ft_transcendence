import { drawGame } from './GameCanvas';

const imagePaths = {
  fake: './fake.png',
  speedUp: './speed.png',
  shield: './shield.png',
  bigger: './bigger.png',
  invert: './invert.png',
};

const images: { [key: string]: HTMLImageElement } = {};

function loadImage(type: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      images[type] = img;
      resolve();
    };
    img.onerror = (err) => {
      console.error(`❌ Erreur de chargement de l'image "${type}" depuis "${src}"`, err);
      reject(new Error(`Impossible de charger l'image "${type}"`));
    };
  });
}


// Canvas and related DOM elements
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d');
const hero = document.getElementById('hero') as HTMLElement | null;
const resultPre = document.getElementById('game-result') as HTMLPreElement | null;
const forfeitBtn = document.getElementById('forfeit-btn') as HTMLButtonElement | null;
// Play buttons and controls
const playAIBtn = document.getElementById('play-ai-btn') as HTMLButtonElement | null;
const playPVPBtn = document.getElementById('play-pvp-btn') as HTMLButtonElement | null;
const diffSelect = document.getElementById('ai-difficulty') as HTMLSelectElement | null;
const customToggle = document.getElementById('custom-toggle') as HTMLInputElement | null;
// PvP menu elements
const pvpMenu = document.getElementById('pvp-menu') as HTMLElement | null;
const pvpCreateBtn = document.getElementById('pvp-create-btn') as HTMLButtonElement | null;
const pvpJoinBtn = document.getElementById('pvp-join-btn') as HTMLButtonElement | null;
const pvpJoinInput = document.getElementById('pvp-join-input') as HTMLInputElement | null;
const pvpJoinConfirmBtn = document.getElementById('pvp-join-confirm-btn') as HTMLButtonElement | null;
// Shareable PvP ID display
const shareDiv = document.getElementById('share-id') as HTMLElement | null;
const gameIdInput = document.getElementById('game-id-input') as HTMLInputElement | null;

const pvpModal = document.getElementById('pvp-modal') as HTMLElement | null;
const pvpModalClose = document.getElementById('pvp-modal-close') as HTMLButtonElement | null;
const pvpModalCreateBtn = document.getElementById('pvp-modal-create-btn') as HTMLButtonElement | null;
const pvpModalJoinInput = document.getElementById('pvp-modal-join-input') as HTMLInputElement | null;
const pvpModalJoinConfirmBtn = document.getElementById('pvp-modal-join-confirm-btn') as HTMLButtonElement | null;
const pvpModalCustomToggle = document.getElementById('pvp-modal-custom-toggle') as HTMLInputElement | null;
const aiModal = document.getElementById('ai-modal') as HTMLElement | null;
const aiModalClose = document.getElementById('ai-modal-close') as HTMLButtonElement | null;
const aiModalDifficulty = document.getElementById('ai-modal-difficulty') as HTMLSelectElement | null;
const aiModalCustomToggle = document.getElementById('ai-modal-custom-toggle') as HTMLInputElement | null;
const aiModalStartBtn = document.getElementById('ai-modal-start-btn') as HTMLButtonElement | null;

if (!canvas || !ctx || !hero || !resultPre || !forfeitBtn || !playAIBtn || !playPVPBtn || !diffSelect || !customToggle || !pvpMenu || !pvpCreateBtn || !pvpJoinBtn || !pvpJoinInput || !pvpJoinConfirmBtn || !shareDiv || !gameIdInput || !pvpModal || !pvpModalClose || !pvpModalCreateBtn || !pvpModalJoinInput || !pvpModalJoinConfirmBtn || !pvpModalCustomToggle || !aiModal || !aiModalClose || !aiModalDifficulty || !aiModalCustomToggle || !aiModalStartBtn) {
  console.error('Missing game controller elements');
}

// State
let gameId = '';
let playerId = '';
let authToken = '';
let lastInput: 'move_up' | 'move_down' | 'stop' | null = null;
let pollTimer: number | undefined;

/** Send a movement or stop input to the server */
function sendInput(type: 'move_up' | 'move_down' | 'stop'): void {
  if (!gameId || !playerId || type === lastInput) return;
  lastInput = type;
  fetch(`/api/game/${gameId}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, type, ts: Date.now(), token: authToken }),
  }).catch(console.error);
}

/** Send a forfeit command to end the game */
function sendForfeit(): void {
  if (!gameId || !playerId) return;
  fetch(`/api/game/${gameId}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, type: 'forfeit', ts: Date.now(), token: authToken }),
  }).catch(console.error);
}

// Input handlers
function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp') sendInput('move_up');
  if (e.key === 'ArrowDown') sendInput('move_down');
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') sendInput('stop');
}

// Polling interval for game state (~60fps)
const POLL_MS = 1000 / 60;

/** Fetch latest game state and draw */
async function fetchAndDraw(): Promise<void> {
  try {
    const res = await fetch(`/api/game/${gameId}/state`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const state = await res.json();
    drawGame(ctx, state, images);
    if (state.isGameOver && pollTimer !== undefined) {
      clearInterval(pollTimer);
      pollTimer = undefined;
      lastInput = null;
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
      resultPre.classList.remove('hidden');
      resultPre.textContent = `Game Over — winner: ${state.winner}`;
      hero.classList.remove('hidden');
      canvas.classList.add('hidden');
      togglePlayButtons(false);
      forfeitBtn.classList.add('hidden');
      shareDiv.classList.add('hidden');
      localStorage.removeItem('gameId');
      localStorage.removeItem('playerId');
      localStorage.removeItem('authToken');
      localStorage.removeItem('mode');
    }
  } catch (err) {
    console.error('[fetchAndDraw]', err);
  }
}

/** Start a new game with given mode and difficulty */
export async function startGame(mode: 'ai' | 'pvp', difficulty?: string): Promise<void> {
  // Preload images
  await Promise.all(Object.entries(imagePaths).map(([type, src]) => loadImage(type, src)));
  
  togglePlayButtons(true);
  hero.classList.add('hidden');
  resultPre.classList.add('hidden');
  canvas.classList.remove('hidden');
  // resize canvas omitted for brevity
  canvas.focus();
  lastInput = null;
  try {
    const isCustomOn = mode === 'ai' ? aiModalCustomToggle.checked : pvpModalCustomToggle.checked;
    const body: any = { mode, isCustomOn };
    if (difficulty) body.difficulty = difficulty;
    const res = await fetch('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    gameId = data.gameId;
    playerId = data.playerId;
    authToken = data.token;
    localStorage.setItem('gameId', gameId);
    localStorage.setItem('playerId', playerId);
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('mode', mode);
    if (difficulty) localStorage.setItem('difficulty', difficulty);
    window.history.pushState({ view: 'game', gameId }, '', `#game/${gameId}`);
    shareDiv.classList.toggle('hidden', mode !== 'pvp');
    if (mode === 'pvp') gameIdInput.value = gameId;
    await fetchAndDraw();
    pollTimer = window.setInterval(fetchAndDraw, POLL_MS);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    forfeitBtn.classList.remove('hidden');
    forfeitBtn.disabled = false;
  } catch (err) {
    console.error('[startGame]', err);
    togglePlayButtons(false);
  }
}

/** Enable/disable play buttons */
function togglePlayButtons(disabled: boolean): void {
  playAIBtn.disabled = disabled;
  playPVPBtn.disabled = disabled;
}

/** Set up game UI and event handlers */
export function setupGame(): void {
  // Forfeit
  forfeitBtn.addEventListener('click', e => { e.preventDefault(); sendForfeit(); forfeitBtn.disabled = true; });
  // Paddle controls
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  // AI play
  playAIBtn.addEventListener('click', e => {
    e.preventDefault();
    aiModal.classList.remove('hidden');
  });
  aiModalClose.addEventListener('click', e => {
    e.preventDefault();
    aiModal.classList.add('hidden');
  });
  aiModal.addEventListener('click', e => {
    if (e.target === aiModal) {
      aiModal.classList.add('hidden');
    }
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !aiModal.classList.contains('hidden')) {
      aiModal.classList.add('hidden');
    }
  });
  aiModalStartBtn.addEventListener('click', e => {
    e.preventDefault();
    aiModal.classList.add('hidden');
    const difficulty = aiModalDifficulty.value;
    startGame('ai', difficulty);
  });
  // PvP menu
  playPVPBtn.addEventListener('click', e => {
    e.preventDefault();
    pvpModal.classList.remove('hidden');
  });
  pvpModalClose.addEventListener('click', e => {
    e.preventDefault();
    pvpModal.classList.add('hidden');
  });
  pvpModal.addEventListener('click', e => {
    if (e.target === pvpModal) {
      pvpModal.classList.add('hidden');
    }
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !pvpModal.classList.contains('hidden')) {
      pvpModal.classList.add('hidden');
    }
  });
  pvpModalCreateBtn.addEventListener('click', e => {
    e.preventDefault();
    pvpModal.classList.add('hidden');
    startGame('pvp');
  });
  pvpModalJoinConfirmBtn.addEventListener('click', async e => {
    e.preventDefault();
    const joinId = pvpModalJoinInput.value.trim();
    if (!joinId) { alert('Please enter a game ID to join'); return; }
    try {
      // Preload images before joining
      await Promise.all(Object.entries(imagePaths).map(([type, src]) => loadImage(type, src)));
      const res = await fetch(`/api/game/${joinId}/join`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed to join game'); return; }
      gameId = data.gameId; playerId = data.playerId; authToken = data.token;
      localStorage.setItem('gameId', gameId); localStorage.setItem('playerId', playerId); localStorage.setItem('authToken', authToken); localStorage.setItem('mode', 'pvp');
      window.history.pushState({ view: 'game', gameId }, '', `#game/${gameId}`);
      pvpModal.classList.add('hidden');
      togglePlayButtons(true); hero.classList.add('hidden'); resultPre.classList.add('hidden'); shareDiv.classList.add('hidden'); canvas.classList.remove('hidden');
      canvas.focus(); lastInput = null;
      await fetchAndDraw(); pollTimer = window.setInterval(fetchAndDraw, POLL_MS);
      window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp);
      forfeitBtn.classList.remove('hidden'); forfeitBtn.disabled = false;
    } catch (err) { console.error('Error joining PvP game:', err); alert('Error joining game'); }
  });
  // Reconnect if hash is #game/<id>
  window.addEventListener('hashchange', () => {
    const m = location.hash.match(/^#game\/(.+)$/);
    if (m) {
      const storedGameId = localStorage.getItem('gameId');
      if (storedGameId === m[1]) {
        // revive session
        gameId = storedGameId;
        playerId = localStorage.getItem('playerId')!;
        authToken = localStorage.getItem('authToken')!;
        resumeGame();
      }
    }
  });

  // Initial check
  const m = location.hash.match(/^#game\/(.+)$/);
  if (m) {
    const storedGameId = localStorage.getItem('gameId');
    if (storedGameId === m[1]) {
      // revive session
      gameId = storedGameId;
      playerId = localStorage.getItem('playerId')!;
      authToken = localStorage.getItem('authToken')!;
      resumeGame();
    }
  }
}

function resumeGame() {
  togglePlayButtons(true);
  hero.classList.add('hidden');
  resultPre.classList.add('hidden');
  canvas.classList.remove('hidden');
  canvas.focus();
  lastInput = null;
  const mode = localStorage.getItem('mode');
  shareDiv.classList.toggle('hidden', mode !== 'pvp');
  if (mode === 'pvp') gameIdInput.value = gameId;
  fetchAndDraw();
  pollTimer = window.setInterval(fetchAndDraw, POLL_MS);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  forfeitBtn.classList.remove('hidden');
  forfeitBtn.disabled = false;
}
