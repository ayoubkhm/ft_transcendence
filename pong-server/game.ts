// ── pong-server/game.ts ────────────────────────────────────────────────────

import
{
    GAME_WIDTH, GAME_HEIGHT,
    PADDLE_H, PADDLE_W, BALL_R,
    GameState, ClientInput
} from './types';

export class Game
{
    private state: GameState;
    private readonly speed       = 240; // vitesse balle (px/s)
    private readonly paddleSpeed = 340; // vitesse paddle (px/s)

    constructor(leftId: string, rightId: string)
    {
    // Initialiser l’état au centre et paddles au milieu verticalement
        this.state =
        {
            ball:
            {
                x: GAME_WIDTH / 2,
                y: GAME_HEIGHT / 2,
                v: {x: this.speed, y: this.speed * 0.5 }
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

  // Réception d’un input depuis le client
handleInput(id: string, input: ClientInput)
{
    const player = this.state.players.find(p => p.id === id);
    if (!player)
        return;

    switch (input.type)
    {
        case 'move_up':
            player.paddle.dy = -1;
            break;
        case 'move_down':
            player.paddle.dy = 1;
            break;
        case 'stop':
            player.paddle.dy = 0;
            break;
    }
  }

  /** 
   * Avance la simulation de dt secondes 
   */
step(dt: number)
{
    const s = this.state;
    // Stopper la simulation si la partie est terminée
    if (s.isGameOver) return;

    // 1) Déplacer les paddles selon dy
    for (const p of s.players)
    {
        p.paddle.y += p.paddle.dy * this.paddleSpeed * dt;
        // On clamp la position pour qu’elle reste dans l’écran
        p.paddle.y = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_H, p.paddle.y));
    }

    // 2) Déplacer la balle
    s.ball.x += s.ball.v.x * dt;
    s.ball.y += s.ball.v.y * dt;

    // 3) Rebond haut/bas
    if (s.ball.y < BALL_R || s.ball.y > GAME_HEIGHT - BALL_R)
        s.ball.v.y *= -1;

    // 4) Rebond sur les paddles
    const hitLeft  = s.ball.x - BALL_R < PADDLE_W;
    const hitRight = s.ball.x + BALL_R > GAME_WIDTH - PADDLE_W;
    if (hitLeft || hitRight)
    {
        const p = hitLeft ? s.players[0] : s.players[1];
        if (s.ball.y > p.paddle.y && s.ball.y < p.paddle.y + PADDLE_H)
            s.ball.v.x *= -1;
    }

    // 5) But ?
    if (s.ball.x < 0 || s.ball.x > GAME_WIDTH)
    {
        // Si x < 0, le jouer à droite marque ; sinon c’est le joueur à gauche
        const scorer = s.ball.x < 0 ? s.players[1] : s.players[0];
        scorer.score += 1;

        // Vérifier si un joueur a gagné (>=11 points et écart >=2)
        const winnerSide = this.hasWinner();
        if (winnerSide)
        {
            s.isGameOver = true;
            s.winner = winnerSide;
            return;
        }
        this.resetBall(s.ball.x < 0 ? 1 : -1);
    }
}

  getState(): GameState
  {
    return this.state;
  }

  /** Pour gérer la fin du jeu et trouver s'il y a un gagnant */
  private hasWinner(): 'left' | 'right' | null
  {
    const [left, right] = this.state.players;
    if (left.score >= 11 && left.score - right.score >= 2) return 'left';
    if (right.score >= 11 && right.score - left.score >= 2) return 'right';
    return null;
  }

  private resetBall(dir: -1 | 1)
  {
    this.state.ball.x = GAME_WIDTH / 2;
    this.state.ball.y = GAME_HEIGHT / 2;
    // On renvoie la balle en direction du dernier but encaissé
    this.state.ball.v = {
      x: dir * this.speed,
      y: this.speed * (Math.random() > 0.5 ? 0.5 : -0.5)
    };
  }
}
