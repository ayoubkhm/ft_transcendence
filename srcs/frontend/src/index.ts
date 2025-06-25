// src/index.ts  – Main SPA logic

/* -------------------- Constants -------------------- */
const GAME_WIDTH  = 800;
const GAME_HEIGHT = 450;
const PADDLE_W = 10;
const PADDLE_H = 80;
const BALL_R   = 6;

/* -------------------- DOM -------------------- */
const loginBtn      = document.getElementById('login-btn')      as HTMLButtonElement | null;
const playAIBtn     = document.getElementById('play-ai-btn')    as HTMLButtonElement | null;
const playPVPBtn    = document.getElementById('play-pvp-btn')   as HTMLButtonElement | null;
const playTournBtn  = document.getElementById('play-tourn-btn') as HTMLButtonElement | null;
const diffSelect    = document.getElementById('ai-difficulty')  as HTMLSelectElement | null;

const canvas   = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const hero     = document.getElementById('hero')        as HTMLElement        | null;
const resultPre= document.getElementById('game-result') as HTMLPreElement     | null;

if (!loginBtn || !playAIBtn || !playPVPBtn || !playTournBtn ||
    !diffSelect || !canvas || !hero || !resultPre) {
  document.getElementById('app')!.innerHTML =
    '<div class="text-red-500 p-4">Missing required DOM elements</div>';
  throw new Error('Missing DOM');
}

/* -------------------- Canvas -------------------- */
canvas.width  = GAME_WIDTH;
canvas.height = GAME_HEIGHT;
const ctx = canvas.getContext('2d')!;

/* -------------------- State -------------------- */
let gameId     = '';
let playerId   = '';
let lastInput: 'move_up' | 'move_down' | 'stop' | null = null;
let pollTimer: number | undefined;

/* -------------------- Rendering -------------------- */
function draw(state: any) {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = 'white';
  const [left, right] = state.players;
  ctx.fillRect(0,                     left.paddle.y,      PADDLE_W, PADDLE_H);
  ctx.fillRect(GAME_WIDTH - PADDLE_W, right.paddle.y,     PADDLE_W, PADDLE_H);

  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, 2 * Math.PI);
  ctx.fill();

  ctx.font = '30px sans-serif';
  ctx.fillText(String(left.score),  GAME_WIDTH * 0.25, 40);
  ctx.fillText(String(right.score), GAME_WIDTH * 0.75, 40);
}

/* -------------------- Input handling -------------------- */
function sendInput(type: 'move_up' | 'move_down' | 'stop') {
  if (!gameId || !playerId || type === lastInput) return;
  lastInput = type;
  fetch(`/api/game/${gameId}/input`, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({ playerId, type, ts: Date.now() })
  }).catch(console.error);
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'ArrowUp')   sendInput('move_up');
  if (e.key === 'ArrowDown') sendInput('move_down');
}
function onKeyUp(e: KeyboardEvent) {
  if (e.key === 'ArrowUp' || e.key === 'ArrowDown') sendInput('stop');
}

/* -------------------- Polling -------------------- */
const POLL_MS = 100;

async function fetchAndDraw() {
  try {
    const res = await fetch(`/api/game/${gameId}/state`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const state = await res.json();
    draw(state);

    if (state.isGameOver && pollTimer) {
      clearInterval(pollTimer);
      pollTimer = undefined;
      lastInput = null;

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {/* ignore */});
      }

      resultPre!.classList.remove('hidden');
      resultPre!.textContent = `Game Over — winner: ${state.winner}`;
      hero!.classList.remove('hidden');
      canvas.classList.add('hidden');
      togglePlayButtons(false);
    }
  } catch (err) {
    console.error('[fetchAndDraw]', err);
  }
}

/* -------------------- Game start -------------------- */
type GameMode = 'ai' | 'pvp' | 'tournament';

async function startGame(mode: GameMode, difficulty?: string) {
  togglePlayButtons(true);
  hero!.classList.add('hidden');
  resultPre!.classList.add('hidden');
  canvas.classList.remove('hidden');
  canvas.focus();
  lastInput = null;

  try {
    const body = { mode, difficulty };
    const res  = await fetch('/api/game', {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body)
    });
    const data = await res.json();
    gameId   = data.gameId;
    playerId = data.playerId;

    await fetchAndDraw();
    pollTimer = window.setInterval(fetchAndDraw, POLL_MS);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

  } catch (err) {
    console.error('[startGame]', err);
    togglePlayButtons(false);
  }
}

/* -------------------- Helpers -------------------- */
function togglePlayButtons(disabled: boolean) {
  playAIBtn!.disabled    = disabled;
  playPVPBtn!.disabled   = disabled;
  playTournBtn!.disabled = disabled;
  loginBtn!.disabled     = disabled;
}

/* -------------------- UI events -------------------- */
loginBtn.addEventListener('click', () => {
  window.location.href = '/api/auth/login/google';
});

playAIBtn.addEventListener('click', () => {
  diffSelect!.classList.toggle('hidden');   // montre / cache le select
  if (!diffSelect!.classList.contains('hidden')) return;

  // On vient de choisir la difficulté → on lance le jeu
  const difficulty = diffSelect!.value; // easy | medium | hard
  canvas.requestFullscreen?.().catch(() => {/* ignore */});
  startGame('ai', difficulty);
});

playPVPBtn.addEventListener('click', () => {
  diffSelect!.classList.add('hidden');
  canvas.requestFullscreen?.().catch(() => {/* ignore */});
  startGame('pvp');
});

playTournBtn.addEventListener('click', () => {
  diffSelect!.classList.add('hidden');
  canvas.requestFullscreen?.().catch(() => {/* ignore */});
  startGame('tournament');
});
