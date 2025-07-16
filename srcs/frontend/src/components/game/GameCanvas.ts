// GameCanvas: rendering logic for game state onto HTMLCanvasElement
const GAME_WIDTH = 800;
const GAME_HEIGHT = 450;
const BALL_R = 6;
const PADDLE_W = 10;
const PADDLE_H = 80;
const BBALL_R = BALL_R * 4;

export function drawGame(ctx: CanvasRenderingContext2D, state: any, images: Record<string, HTMLImageElement>) {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  if (state.countdown && state.countdown > 0) {
    const prevAlign = ctx.textAlign;
    const prevBaseline = ctx.textBaseline;
    ctx.fillStyle = 'white';
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Starting in ${state.countdown}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.textAlign = prevAlign;
    ctx.textBaseline = prevBaseline;
    return;
  }
  // Draw ball
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(state.ball.x, state.ball.y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
  // Draw bonus balls
  if (Array.isArray(state.bonusBalls)) {
    state.bonusBalls.forEach((bonus: any) => {
      const img = images[bonus.type];
      if (img?.complete) {
        ctx.drawImage(img, bonus.x - BBALL_R, bonus.y - BBALL_R, BBALL_R * 2, BBALL_R * 2);
      }
    });
  }
  // Draw paddles
  state.players.forEach((player: any) => {
    const x = player.side === 'left' ? 0 : GAME_WIDTH - PADDLE_W;
    if (player.power.includes('s')) {
      ctx.fillStyle = 'gold';
      ctx.fillRect(x, 0, PADDLE_W, GAME_HEIGHT);
    }
    ctx.fillStyle = 'white';
    let i = player.power.length - 1;
    while (i >= 0 && (player.power[i] === 's' || player.power[i] === 'f')) i--;
    if (player.power[i] === 'i') ctx.fillStyle = 'purple';
    else if (player.power[i] === 'v') ctx.fillStyle = 'blue';
    else if (player.power[i] === 'b') ctx.fillStyle = 'red';
    ctx.fillRect(x, player.paddle.y, player.paddle.w, player.paddle.h);
  });
  // Draw phantom balls
  state.phantomBalls?.forEach((ball: any) => {
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  });
  // Draw scores
  ctx.fillStyle = 'white';
  ctx.font = '20px sans-serif';
  ctx.fillText(state.players[0].score, GAME_WIDTH / 4, 20);
  ctx.fillText(state.players[1].score, (GAME_WIDTH * 3) / 4, 20);
  // Draw elapsed time
  if (state.timer != null) {
    ctx.fillStyle = 'white';
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    const totalSeconds = Math.floor(state.timer / 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = seconds.toString().padStart(2, '0');
    ctx.fillText(`Time: ${minutes}:${paddedSeconds}`, GAME_WIDTH / 2, 40);
    ctx.textAlign = 'left';
  }
}
// Additional rendering and help functions can be added here