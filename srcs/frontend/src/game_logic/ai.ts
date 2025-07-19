import { PADDLE_H, PADDLE_W, BALL_R, GAME_HEIGHT, GAME_WIDTH } from './types.js';
import type { Paddle, Ball } from './types.js';

/**
 * Simple AI: move paddle toward ball on Y axis, clamped within game bounds.
 * @param paddle The AI paddle (with y position).
 * @param ball The ball object (providing y position).
 * @param aiSpeed Maximum paddle speed (pixels per second).
 * @param dt Time delta in seconds.
 * @returns The new y position of the paddle.
 */
/**
 * AI predicts the ball's crossing point at its paddle's X-plane and moves toward it.
 */
export function aiPaddleMove(paddle: Paddle, ball: Ball, aiSpeed: number, dt: number): number
{
  // If ball moving away or no horizontal speed, return toward vertical center
  if (ball.v.x <= 0)
    {
      const centerY = (GAME_HEIGHT - PADDLE_H) / 2;
      const diff = centerY - paddle.y;
      const maxMove = aiSpeed * dt;
      const delta = Math.sign(diff) * Math.min(Math.abs(diff), maxMove);
      const newY = paddle.y + delta;
      return Math.max(0, Math.min(newY, GAME_HEIGHT - PADDLE_H));
    }

  // Predict time when ball reaches the AI paddle plane
  const planeX = GAME_WIDTH - PADDLE_W - BALL_R;
  const t = (planeX - ball.x) / ball.v.x;

  // Compute vertical travel including bounces off top/bottom
  const effH = GAME_HEIGHT - 2 * BALL_R;
  const initial = ball.y - BALL_R;
  const total = initial + ball.v.y * t;

  // Reflect within [0, 2*effH]
  const mod = ((total % (2 * effH)) + 2 * effH) % (2 * effH);
  const reflectY = mod <= effH ? mod : 2 * effH - mod;

  // Center target position before noise
  const targetCenter = reflectY + BALL_R;


  // Desired paddle Y to center on predicted (noisy) hit location
  const desiredY = targetCenter - PADDLE_H / 2;
  
  // Move toward desiredY with speed limit
  const diffY = desiredY - paddle.y;
  const maxMove = aiSpeed * dt;
  const deltaY = Math.sign(diffY) * Math.min(Math.abs(diffY), maxMove);
  const newY = paddle.y + deltaY;
  
  // Clamp within bounds
  return Math.max(0, Math.min(newY, GAME_HEIGHT - PADDLE_H));
}
