// ── pong-server/types.ts ───────────────────────────────────────────────────

export const GAME_WIDTH  = 800;
export const GAME_HEIGHT = 450;

// Largeur et hauteur d’un paddle
export const PADDLE_W = 10;
export const PADDLE_H = 80;

export const POWER_UPV = 3;
export const POWER_UPB = 1.5;
// Rayon de la balle
export const BALL_R = 6;

// Vecteur 2D
export type Vec = { x: number; y: number };

// On stocke la position `y` + la vélocité verticale `dy` dans Paddle
export type Paddle = {
  y:  number;
  dy: number;
  w : number,
  h: number // ← on l’ajoute ici
};

export type PhantomBall =
{
  x: number;
  y: number;
  v: { x: number; y: number };
  ownerId: string;
  createdAt: number; // tick à la création
};


// La balle stocke sa position et sa vitesse
export type Ball = Vec & { v: Vec };

export interface BonusBall extends Ball
{
  active: boolean;
  type: 'speedUp' | 'fake' | 'shield' | 'bigger';
  owner?: 'left' | 'right';
}


// Un joueur a un `id`, un côté (left/right), son paddle + son score
export interface Player
{
    id:     string;           // identifiant unique
    side:   'left' | 'right';
    paddle: Paddle;
    score:  number;
    speedMultiplier: number,
    cpttime: number[];
    cpttch: number
    power: string
    i: number
    /** Total number of power-ups this player has used */
    powerUpsUsed: number;
    /** Total vertical distance the paddle has moved (in pixels) */
    distanceMoved: number;
    /** Current consecutive scoring streak for this player */
    streak: number;
}

// État complet d’une partie
export interface GameState
{
    phantomBalls?: PhantomBall[];
    bonusBalls?: BonusBall[]; // nouveau champ
    ball:    Ball;
    players: [Player, Player];   // index 0 = left, index 1 = right
    // Flag and winner info when game is over
    isCustomon?: boolean;
    isGameOver?: boolean;
    timer : number;
    /** Seconds remaining before game starts */
    countdown?: number;
    winner?: 'left' | 'right';
}

// Messages que peut envoyer le client
export type ClientInput =
  | { type: 'move_up';   ts: number }
  | { type: 'move_down'; ts: number }
  | { type: 'stop';      ts: number }
  | { type: 'forfeit';   ts: number };
