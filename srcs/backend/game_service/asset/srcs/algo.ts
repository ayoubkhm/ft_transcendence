// ── pong-server/game.ts ───────────────────────────────────────────────────
import {
  GAME_WIDTH, GAME_HEIGHT,
  PADDLE_H, PADDLE_W, BALL_R,
  GameState, ClientInput
} from './types.js';
import { aiPaddleMove } from './ai/index.js';

// AI difficulty levels
type AIDifficulty = 'easy' | 'medium' | 'hard';
export class Game {
  private state: GameState;
  private readonly speed       = 400; // ball speed (px/s)
  private readonly paddleSpeed = 340; // player paddle speed (px/s)
  private readonly aiSpeed     = 100; // base AI paddle speed (px/s)
  private readonly aiDifficulty: AIDifficulty;

  constructor(
    leftId: string,
    rightId: string /* "AI" for solo */,
    aiDifficulty: AIDifficulty = 'medium'
  ) {
    this.aiDifficulty = aiDifficulty;
    this.state = {
      ball: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        v: { x: this.speed, y: this.speed * 0.5 }
      },
      players: [
        {
          id: leftId,
          side: 'left',
          paddle: { y: GAME_HEIGHT / 2 - PADDLE_H / 2, dy: 0 },
          score: 0
        },
        {
          id: rightId,
          side: 'right',
          paddle: { y: GAME_HEIGHT / 2 - PADDLE_H / 2, dy: 0 },
          score: 0
        }
      ]
    };
  }

  // ────────────────────────────────────────────────────────────────────────
  // GESTION DES INPUTS JOUEUR HUMAIN
  // ────────────────────────────────────────────────────────────────────────
  handleInput(id: string, msg: ClientInput) {
    const p = this.state.players.find(pl => pl.id === id);
    if (!p) return;

    if (msg.type === 'move_up')   p.paddle.dy = -this.paddleSpeed;
    if (msg.type === 'move_down') p.paddle.dy =  this.paddleSpeed;
    if (msg.type === 'stop')      p.paddle.dy =  0;
  }

  // ────────────────────────────────────────────────────────────────────────
  // BOUCLE DE SIMULATION
  // ────────────────────────────────────────────────────────────────────────
  step(dt: number) {
    const [left, right] = this.state.players;
    const ball = this.state.ball;

    // 1) Déplacement des paddles humains
    for (const pl of this.state.players) {
      // IA ne bouge pas ici
      if (pl.id !== 'AI') {
        pl.paddle.y += pl.paddle.dy * dt;
        pl.paddle.y = clamp(pl.paddle.y, 0, GAME_HEIGHT - PADDLE_H);
      }
    }

    // 2) AI paddle movement (right side)
    if (right.id === 'AI') {
      // Determine AI speed and noise based on difficulty
      let speedMul = 1;
      let noiseAmp = 0;
      switch (this.aiDifficulty) {
        case 'easy':
          speedMul = 0.9;
          noiseAmp = PADDLE_H * 0.3;
          break;
        case 'medium':
          speedMul = 1;
          noiseAmp = PADDLE_H * 0.1;
          break;
        case 'hard':
          speedMul = 1;
          noiseAmp = 0;
          break;
      }
      // Apply mistake probability: occasional misprediction
      const mistakeProb = this.aiDifficulty === 'easy'
        ? 0.4
        : this.aiDifficulty === 'medium'
          ? 0.3
          : 0.1; // hard difficulty: 10% chance of mistake
      if (Math.random() < mistakeProb) {
        // use full-range noise to simulate error
        noiseAmp = GAME_HEIGHT;
      }
      // Compute effective AI speed and noise per difficulty
      const effectiveSpeed = this.aiSpeed * speedMul;
      const effectiveNoiseAmp = noiseAmp;
      // Move AI paddle
      right.paddle.y = aiPaddleMove(
        right.paddle,
        ball,
        effectiveSpeed,
        dt,
        effectiveNoiseAmp
      );
    }

    // 3) Déplacement de la balle
    ball.x += ball.v.x * dt;
    ball.y += ball.v.y * dt;

    // rebond haut/bas
    if (ball.y - BALL_R <= 0 || ball.y + BALL_R >= GAME_HEIGHT)
      ball.v.y *= -1;

    // Paddle collision with angle based on hit position
    const maxBounceAngle = Math.PI / 4; // 45 degrees
    // Left paddle
    if (ball.x - BALL_R <= PADDLE_W) {
      const py = left.paddle.y;
      if (ball.y >= py && ball.y <= py + PADDLE_H) {
        // Compute normalized intersection [-1..1]
        const paddleCenter = py + PADDLE_H / 2;
        const relativeY = (ball.y - paddleCenter) / (PADDLE_H / 2);
        const clamped = Math.max(-1, Math.min(relativeY, 1));
        const bounceAngle = clamped * maxBounceAngle;
        // Preserve speed magnitude
        const speedMag = Math.hypot(ball.v.x, ball.v.y);
        ball.v.x =  speedMag * Math.cos(bounceAngle);
        ball.v.y =  speedMag * Math.sin(bounceAngle);
      }
    }
    // Right paddle
    if (ball.x + BALL_R >= GAME_WIDTH - PADDLE_W) {
      const py = right.paddle.y;
      if (ball.y >= py && ball.y <= py + PADDLE_H) {
        // Compute normalized intersection [-1..1]
        const paddleCenter = py + PADDLE_H / 2;
        const relativeY = (ball.y - paddleCenter) / (PADDLE_H / 2);
        const clamped = Math.max(-1, Math.min(relativeY, 1));
        const bounceAngle = clamped * maxBounceAngle;
        // Preserve speed magnitude
        const speedMag = Math.hypot(ball.v.x, ball.v.y);
        ball.v.x = -speedMag * Math.cos(bounceAngle);
        ball.v.y =  speedMag * Math.sin(bounceAngle);
      }
    }

    // 4) Score et fin de manche
    if (ball.x < 0)       { right.score++; resetBall(ball, -this.speed); }
    if (ball.x > GAME_WIDTH) { left.score++;  resetBall(ball,  this.speed); }

    // 5) Fin de partie ?
    if (left.score >= 7 || right.score >= 7) {
      this.state.isGameOver = true;
      this.state.winner     = left.score > right.score ? 'left' : 'right';
    }
  }

  getState(): GameState { return this.state; }
}

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function resetBall(ball: any, newVx: number) {
  ball.x = GAME_WIDTH  / 2;
  ball.y = GAME_HEIGHT / 2;
  ball.v.x = newVx;
  ball.v.y = (Math.random() * 0.6 - 0.3) * Math.abs(newVx);
}
