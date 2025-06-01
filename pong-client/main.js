/*Tout ce code c'est full GPT. L'idée c'était surtout de pouvoir illustrer
le fonctionnement d'un jeu Pong en temps réel et pour moi de tester que
le taf côté serveur était foncitonnel.
*/

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const ws = new WebSocket('ws://localhost:8080');

let gameState = null;
let side = null;
// Indique si la partie est terminée
let gameOver = false;

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'state') {
    gameState = msg.payload;
  } else if (msg.type === 'start') {
    side = msg.side;
  } else if (msg.type === 'gameOver') {
    gameState = msg.payload;
    gameOver = true;
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp')   sendInput('move_up');
  if (e.key === 'ArrowDown') sendInput('move_down');
});
document.addEventListener('keyup', (e) => {
  if (['ArrowUp', 'ArrowDown'].includes(e.key)) sendInput('stop');
});

function sendInput(type) {
  ws.send(JSON.stringify({ type, ts: Date.now() }));
}

function draw() {
  if (!gameState) return requestAnimationFrame(draw);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Si la partie est terminée, afficher le gagnant
  if (gameOver && gameState?.winner) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Winner: ${gameState.winner}`, canvas.width / 2, canvas.height / 2);
    return requestAnimationFrame(draw);
  }
  // draw ball
  const b = gameState.ball;
  ctx.beginPath();
  ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // draw paddles
  for (const p of gameState.players) {
    ctx.fillStyle = p.side === side ? '#0f0' : '#f00';
    ctx.fillRect(
      p.side === 'left' ? 0 : canvas.width - 10,
      p.paddle.y,
      10,
      80
    );
  }

  // draw scores
  ctx.fillStyle = "#fff";
  ctx.font = "24px sans-serif";
  ctx.fillText(gameState.players[0].score, canvas.width / 2 - 40, 30);
  ctx.fillText(gameState.players[1].score, canvas.width / 2 + 20, 30);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
