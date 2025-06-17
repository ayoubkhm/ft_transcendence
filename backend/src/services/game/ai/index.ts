import { PADDLE_H, GAME_HEIGHT } from '../types.js';
import type { Paddle, Ball } from '../types.js';

/**
 * Simple AI: move paddle toward ball on Y axis, clamped within game bounds.
 * @param paddle The AI paddle (with y position).
 * @param ball The ball object (providing y position).
 * @param aiSpeed Maximum paddle speed (pixels per second).
 * @param dt Time delta in seconds.
 * @returns The new y position of the paddle.
 */
export function aiPaddleMove(
  paddle: Paddle,
  ball: Ball,
  aiSpeed: number,
  dt: number
): number {
  const center = paddle.y + PADDLE_H / 2;
  const target = ball.y;
  const dir = target > center ? 1 : -1;
  const newY = paddle.y + dir * aiSpeed * dt;
  // Clamp within top and bottom bounds
  return Math.max(0, Math.min(newY, GAME_HEIGHT - PADDLE_H));
}