// Entry point for front-end API tester

const startBtn = document.getElementById('start-game') as HTMLButtonElement | null;
const resultDiv = document.getElementById('game-result') as HTMLDivElement | null;
// Game canvas and drawing context
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const ctx = canvas?.getContext('2d');
// Game constants matching backend
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const PADDLE_W = 10;
const PADDLE_H = 80;
const BALL_R = 6;
// Login button for Google OAuth
const loginBtn = document.getElementById('login-google') as HTMLButtonElement | null;
loginBtn?.addEventListener('click', () => {
  // Open OAuth login flow in a new tab
  window.open('http://localhost:3000/api/auth/login/google', '_blank');
});
// Game session identifiers and interval handle
let gameId: string;
let playerId: string;
let stateInterval: number;

startBtn?.addEventListener('click', () => {
  // Start new game with chosen AI difficulty
  // Read selected difficulty
  const difficultySelect = document.getElementById('difficulty') as HTMLSelectElement | null;
  const difficulty = difficultySelect?.value;
  // Prepare request options: include JSON body when difficulty provided
  const opts: RequestInit = { method: 'POST' };
  if (difficulty) {
    opts.headers = { 'Content-Type': 'application/json' };
    opts.body = JSON.stringify({ difficulty });
  }
  fetch('http://localhost:3001/api/game', opts)
    .then((res) => res.json())
    .then((data) => {
      gameId = data.gameId;
      playerId = data.playerId;

      // Hide API tester UI
      (document.querySelector('table') as HTMLElement).style.display = 'none';
      startBtn!.style.display = 'none';
      resultDiv!.style.display = 'none';

      // Show and focus the game canvas
      if (canvas) {
        canvas.style.display = 'block';
        canvas.focus();
      }

      // Start polling game state and drawing at ~60fps
      stateInterval = window.setInterval(fetchAndDraw, 1000 / 60);

      // Set up keyboard controls
      setupInput();
    })
    .catch((err) => {
      if (resultDiv) {
        resultDiv.innerHTML =
          `<div class="alert alert-danger">Error: ${err}</div>`;
      }
    });
});
// Fetch the latest game state and render it
function fetchAndDraw() {
  fetch(`http://localhost:3001/api/game/${gameId}/state`)
    .then((res) => res.json())
    .then((state) => {
      draw(state);
      if (state.isGameOver) {
        clearInterval(stateInterval);
        if (resultDiv) {
          resultDiv.style.display = 'block';
          resultDiv.innerHTML = `<h3>Game Over: ${state.winner} wins!</h3>`;
        }
      }
    });
}

// Render game state on canvas
function draw(state: any)
{
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  // Draw ball
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  // Draw paddles
  ctx.fillStyle = 'white';
  state.players.forEach((player: any) => {
    const x = player.side === 'left' ? 0 : GAME_WIDTH - PADDLE_W;
    ctx.fillRect(x, player.paddle.y, PADDLE_W, PADDLE_H);
  });
  // Draw scores
  ctx.fillStyle = 'white';
  ctx.font = '20px sans-serif';
  ctx.fillText(`${state.players[0].score}`, GAME_WIDTH / 4, 20);
  ctx.fillText(`${state.players[1].score}`, (GAME_WIDTH * 3) / 4, 20);
}

// Set up keyboard input handlers
function setupInput() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') sendInput('move_up');
    if (e.key === 'ArrowDown') sendInput('move_down');
  });
  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') sendInput('stop');
  });
}

// Send a player input event to the backend
function sendInput(type: 'move_up' | 'move_down' | 'stop') {
  fetch(`http://localhost:3001/api/game/${gameId}/input`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, type, ts: Date.now() }),
  });
}