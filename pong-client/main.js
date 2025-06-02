const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const btnMulti = document.getElementById('btn-multiplayer');
const btnSolo = document.getElementById('btn-solo');

let gameState = null;
let side = null;
let gameOver = false;
let isSolo = false;

let ws;

btnMulti.onclick = () => {
  isSolo = false;
  initGame(false);
};

btnSolo.onclick = () => {
  isSolo = true;
  initGame(true);
};



function initGame(soloMode = false) {
  document.getElementById('menu').style.display = 'none';
  canvas.style.display = 'block';

  // connect to WebSocket endpoint
  ws = new WebSocket('ws://localhost:8080/ws');

  ws.onopen = () => {
    // In solo mode, send startSolo first so server recognizes the game start
    if (soloMode) {
      ws.send(JSON.stringify({ type: 'startSolo' }));
    }
    // Send a hello handshake (ignored by server, but may unblock initial listener)
    ws.send(JSON.stringify({ type: 'hello' }));
  };


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
    if (e.key === 'ArrowUp') sendInput('move_up');
    if (e.key === 'ArrowDown') sendInput('move_down');
  });

  document.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown'].includes(e.key)) sendInput('stop');
  });

  requestAnimationFrame(draw);
}

function sendInput(type) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ts: Date.now() }));
  }
}

function draw() {
  if (!gameState) return requestAnimationFrame(draw);

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameOver && gameState?.winner) {
    ctx.fillStyle = '#fff';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Winner: ${gameState.winner}`, canvas.width / 2, canvas.height / 2);
    return requestAnimationFrame(draw);
  }

  drawCommon();
  requestAnimationFrame(draw);
}

function drawCommon() {
  const b = gameState.ball;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ball
  ctx.beginPath();
  ctx.arc(b.x, b.y, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();

  // Paddles
  for (const p of gameState.players) {
    ctx.fillStyle = p.side === side ? '#0f0' : '#f00';
    ctx.fillRect(
      p.side === 'left' ? 0 : canvas.width - 10,
      p.paddle.y,
      10,
      80
    );
  }

  // Scores
  ctx.fillStyle = "#fff";
  ctx.font = "24px sans-serif";
  ctx.fillText(gameState.players[0].score, canvas.width / 2 - 40, 30);
  ctx.fillText(gameState.players[1].score, canvas.width / 2 + 20, 30);
}
