// ── pong-server/types.ts ───────────────────────────────────────────────────

export const GAME_WIDTH  = 800;
export const GAME_HEIGHT = 450;

// Largeur et hauteur d’un paddle
export const PADDLE_W = 10;
export const PADDLE_H = 80;

// Rayon de la balle
export const BALL_R = 6;

// Vecteur 2D
export type Vec = { x: number; y: number };

// On stocke la position `y` + la vélocité verticale `dy` dans Paddle
export type Paddle = {
  y:  number;
  dy: number; // ← on l’ajoute ici
};

// La balle stocke sa position et sa vitesse
export type Ball = Vec & { v: Vec };

// Un joueur a un `id`, un côté (left/right), son paddle + son score
export interface Player
{
    id:     string;           // identifiant unique
    side:   'left' | 'right';
    paddle: Paddle;
    score:  number;
}

// État complet d’une partie
export interface GameState
{
    ball:    Ball;
    players: [Player, Player];   // index 0 = left, index 1 = right
    // Flag and winner info when game is over
    isGameOver?: boolean;
    winner?: 'left' | 'right';
}

// Messages que peut envoyer le client
export type ClientInput =
  | { type: 'move_up';   ts: number }
  | { type: 'move_down'; ts: number }
  | { type: 'stop';      ts: number };
