// ── pong-server/game.ts ───────────────────────────────────────────────────
import { GAME_WIDTH, GAME_HEIGHT, PADDLE_H, PADDLE_W, BALL_R } from './types.js';
import { aiPaddleMove } from './ai/index.js';
export class Game {
    constructor(leftId, rightId /* "AI" pour solo */) {
        this.speed = 400; // vitesse balle  (px/s)
        this.paddleSpeed = 340; // vitesse joueur (px/s)
        this.aiSpeed = 280; // vitesse max IA (px/s)
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
    handleInput(id, msg) {
        const p = this.state.players.find(pl => pl.id === id);
        if (!p)
            return;
        if (msg.type === 'move_up')
            p.paddle.dy = -this.paddleSpeed;
        if (msg.type === 'move_down')
            p.paddle.dy = this.paddleSpeed;
        if (msg.type === 'stop')
            p.paddle.dy = 0;
    }
    // ────────────────────────────────────────────────────────────────────────
    // BOUCLE DE SIMULATION
    // ────────────────────────────────────────────────────────────────────────
    step(dt) {
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
        // 2) IA très simple (raquette droite uniquement)
        if (right.id === 'AI') {
            right.paddle.y = aiPaddleMove(right.paddle, ball, this.aiSpeed, dt);
        }
        // 3) Déplacement de la balle
        ball.x += ball.v.x * dt;
        ball.y += ball.v.y * dt;
        // rebond haut/bas
        if (ball.y - BALL_R <= 0 || ball.y + BALL_R >= GAME_HEIGHT)
            ball.v.y *= -1;
        // rebond sur paddles
        if (ball.x - BALL_R <= PADDLE_W) {
            if (ball.y >= left.paddle.y && ball.y <= left.paddle.y + PADDLE_H)
                ball.v.x *= -1;
        }
        if (ball.x + BALL_R >= GAME_WIDTH - PADDLE_W) {
            if (ball.y >= right.paddle.y && ball.y <= right.paddle.y + PADDLE_H)
                ball.v.x *= -1;
        }
        // 4) Score et fin de manche
        if (ball.x < 0) {
            right.score++;
            resetBall(ball, -this.speed);
        }
        if (ball.x > GAME_WIDTH) {
            left.score++;
            resetBall(ball, this.speed);
        }
        // 5) Fin de partie ?
        if (left.score >= 7 || right.score >= 7) {
            this.state.isGameOver = true;
            this.state.winner = left.score > right.score ? 'left' : 'right';
        }
    }
    getState() { return this.state; }
}
// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}
function resetBall(ball, newVx) {
    ball.x = GAME_WIDTH / 2;
    ball.y = GAME_HEIGHT / 2;
    ball.v.x = newVx;
    ball.v.y = (Math.random() * 0.6 - 0.3) * Math.abs(newVx);
}
