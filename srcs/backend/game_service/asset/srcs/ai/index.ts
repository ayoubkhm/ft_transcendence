import { PADDLE_H, PADDLE_W, BALL_R, GAME_HEIGHT, GAME_WIDTH } from '../types.js';
import type { Paddle, Ball } from '../types.js';

import { PADDLE_H, PADDLE_W, BALL_R, GAME_HEIGHT, GAME_WIDTH } from '../types.js';
import type { Paddle, Ball } from '../types.js';

/**
 * Predicts the ball's final Y position on the AI's side, with optional error.
 * @param ball The ball object.
 * @param options Difficulty settings for prediction.
 * @returns The predicted Y coordinate for the center of the ball.
 */
export function predictBallY(
  ball: Ball,
  options: { predictionError: number }
): number {
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

  // Center target position
  const targetCenter = reflectY + BALL_R;

  // Add prediction error based on difficulty
  const error = (Math.random() - 0.5) * options.predictionError;
  return targetCenter + error;
}

/**
 * Moves a paddle toward a target Y position, respecting speed limits.
 * @param paddle The AI paddle.
 * @param targetY The Y coordinate to move towards.
 * @param aiSpeed Maximum paddle speed (pixels per second).
 * @param dt Time delta in seconds.
 * @returns The new y position of the paddle.
 */
export function movePaddleToTarget(
  paddle: Paddle,
  targetY: number,
  aiSpeed: number,
  dt: number
): number {
  // Desired paddle Y to center on the target
  const desiredY = targetY - paddle.h / 2;

  // Move toward desiredY with speed limit
  const diffY = desiredY - paddle.y;
  const maxMove = aiSpeed * dt; // Full speed, no reaction factor
  const deltaY = Math.sign(diffY) * Math.min(Math.abs(diffY), maxMove);
  const newY = paddle.y + deltaY;

  // Clamp within bounds
  return Math.max(0, Math.min(newY, GAME_HEIGHT - paddle.h));
}
