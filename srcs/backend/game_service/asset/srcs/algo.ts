import {
  GAME_WIDTH, GAME_HEIGHT,
  PADDLE_H, PADDLE_W, BALL_R,
  GameState, ClientInput, Ball, BonusBall,
  POWER_UPV, POWER_UPB
} from './types.js';
import { aiPaddleMove } from './ai/index.js';
import { PoolClient } from 'pg';

const BALL_XLR = 1.05;

// AI difficulty levels
type AIDifficulty = 'easy' | 'medium' | 'hard';
export class Game
{
    private state: GameState;
    private readonly speed       = 400; // ball speed (px/s)
    private paddleSpeed           = 340; // paddle speed for both human and AI (px/s)
    private readonly aiDifficulty: AIDifficulty;
    // Whether custom power-ups/features are enabled
    private readonly customOn: boolean;
    // cumulative stats per player
    private powerUpsUsed: Record<string, number>;
    private distanceMoved: Record<string, number>;
    private lastScorerId: string | null;
    private streaks: Record<string, number>;
    /** Countdown ticks (1 tick = 1/60s) before simulation starts */
    private countdownTicks: number;
	gameId: number;
	ballspeedM: number;

    constructor(
        leftId: string,
        rightId: string,
        leftDbId: number | null,
        rightDbId: number | null,
        type: 'IA' | 'TOURNAMENT' | 'VS',
        aiDifficulty: AIDifficulty = 'medium',
        customOn: boolean = true,
		gameId: number,

    ) {
		this.gameId = gameId;
        this.aiDifficulty = aiDifficulty;
        this.customOn = customOn;
        // initialize cumulative stats
        this.powerUpsUsed = { [leftId]: 0, [rightId]: 0 };
        this.distanceMoved = { [leftId]: 0, [rightId]: 0 };
        this.lastScorerId = null;
        this.streaks = { [leftId]: 0, [rightId]: 0 };
		this.ballspeedM = 1;
        // Set initial countdown: 5 seconds at 60 ticks/s
        this.countdownTicks = 5 * 60;
        this.state =
        {
            type: type,
			ball:
			{
				x: GAME_WIDTH / 2,
				y: GAME_HEIGHT / 2,
				v: { x: this.speed, y: this.speed * 0.5 }
			},
        players: [
            {
                id: leftId,
                dbId: leftDbId,
                side: 'left',
                paddle: { y: GAME_HEIGHT / 2 - PADDLE_H / 2, dy: 0, w: PADDLE_W, h: PADDLE_H },
                score: 0,
                speedMultiplier: 1,
                i: 0,
                power: "",
                cpttch: 0,
                cpttime: [],
                powerUpsUsed: 0,
                distanceMoved: 0,
                streak: 0,
            },
            {
                id: rightId,
                dbId: rightDbId,
                side: 'right',
                paddle: { y: GAME_HEIGHT / 2 - PADDLE_H / 2, dy: 0, w: PADDLE_W, h: PADDLE_H },
                score: 0,
                speedMultiplier: 1,
                i: 0,
                power: "",
                cpttch: 0,
                cpttime: [],
                powerUpsUsed: 0,
                distanceMoved: 0,
                streak: 0,
            }
        ],
			// flag whether custom mode is active
            isCustomon: customOn,
			bonusBalls: [],
			timer : 0
		};
	}
	getGameId(): number {return this.gameId;}


	async addScore(pgClient: PoolClient, scorerIsLeft: boolean): Promise<void>
	{
		console.log("\n\n\nHEYYYYYYYYYY NEW SCORE\n\n\n\n");
		try {
			const res = await pgClient.query('SELECT * FROM score($1::INTEGER, $2::BOOLEAN)',
			[this.getGameId(), scorerIsLeft]);
			if (res.rows.length > 0 && res.rows[0].msg)
				console.log(res.rows[0].msg);
		} catch (err) {
			console.error('Error calling score() for game', this.getGameId(), err);
		}
	}


	// ────────────────────────────────────────────────────────────────────────
	// GESTION DES INPUTS JOUEUR HUMAIN
	// ────────────────────────────────────────────────────────────────────────
   handleInput(id: string, msg: ClientInput)
   {
       const p = this.state.players.find(pl => pl.id === id);
       if (!p) return;
       // Handle forfeit: end game and declare other player as winner
       if (msg.type === 'forfeit') {
           this.state.isGameOver = true;
           this.state.winner = p.side;
           return;
       }
		if (msg.type === 'move_up')	
		p.paddle.dy = -this.paddleSpeed * p.speedMultiplier;
		if (msg.type === 'move_down')
		p.paddle.dy = this.paddleSpeed * p.speedMultiplier;
		if (msg.type === 'stop')
			p.paddle.dy = 0;
	}

	removepower(player)
	{
		let newPower = "";
		let newTimes = [];
		for (let j = 0; j < player.i; j++)
		{
			if (this.state.timer - player.cpttime[j] >= 480)
			{
				const type = player.power[j];
				if(!type)
					continue;
				if (type === "v")
					player.speedMultiplier /= POWER_UPV;
				else if (type === "b")
					player.paddle.h /= POWER_UPB;
				else if (type === "f" && this.state.phantomBalls)
					this.state.phantomBalls = this.state.phantomBalls.filter(b => b.ownerId !== player.id);
			}
			else
			{
				newPower += player.power[j];
				newTimes.push(player.cpttime[j]);
			}
		}
		player.power = newPower;
		player.cpttime = newTimes;
		player.i = newPower.length;
	}


	private applyBonus(playerSide: 'left' | 'right', type: string)
	{
        const player = this.state.players.find(p => p.side === playerSide);
        if (!player)
            return;
        // Increment power-up usage count for this player
        this.powerUpsUsed[player.id] = (this.powerUpsUsed[player.id] || 0) + 1;
		switch (type)
		{
			case 'speedUp':
				player.speedMultiplier = POWER_UPV;
				player.power += "v";
				break;
			case 'shield':
				player.power += "s";
				break;
			case 'bigger':
				player.power += "b";
				player.paddle.h *= POWER_UPB;
				break;
			case 'fake':
			player.power += "f";

			if (!this.state.phantomBalls)
				this.state.phantomBalls = [];

			this.state.phantomBalls.push({
				x: this.state.ball.x,
				y: this.state.ball.y,
				v: {
				x: this.state.ball.v.x * Randombetween(0.4, 0.8) * (Math.random() < 0.5 ? -1 : 1),
				y: this.state.ball.v.y * Randombetween(0.4, 0.8) * (Math.random() < 0.5 ? -1 : 1)
				},
				createdAt: this.state.timer,
				ownerId: player.id
			});
			break;

		}
		player.cpttime[player.i] = this.state.timer;
		player.i++;
	}

	// ────────────────────────────────────────────────────────────────────────
	// BOUCLE DE SIMULATION
	// ────────────────────────────────────────────────────────────────────────
	async step(dt: number, pgClient: PoolClient): Promise<void>
	{

        // Countdown before simulation starts
        if (this.countdownTicks > 0) {
            this.countdownTicks--;
            return;
        }
		const [left, right] = this.state.players;
		const ball = this.state.ball;
		// maintain custom mode flag
		this.state.isCustomon = this.customOn;
		// 1) Déplacement des paddles humains
        for (const pl of this.state.players) {
            // Human paddle movement and tracking
            if (pl.id !== 'AI') {
                const oldY = pl.paddle.y;
                let newY = oldY + pl.paddle.dy * dt;
                newY = clamp(newY, 0, GAME_HEIGHT - pl.paddle.h);
                pl.paddle.y = newY;
                // Accumulate distance moved
                this.distanceMoved[pl.id] += Math.abs(newY - oldY);
            }
        }
        // 2) AI paddle movement (right side)
        if (right.id === 'AI') {
            // AI paddle moves at same base speed as human (including speed-up power-ups)
            const oldY = right.paddle.y;
            const effectiveSpeed = this.paddleSpeed * right.speedMultiplier;
            const newY = aiPaddleMove(right.paddle, ball, effectiveSpeed, dt);
            // Accumulate distance moved by AI paddle
            this.distanceMoved[right.id] += Math.abs(newY - oldY);
            right.paddle.y = newY;
        }
		let rand : number = Math.random();
		if (this.state.isCustomon && Math.random() < 0.004)
		{
			const mainBall = this.state.ball;
			const newBall: BonusBall =
			{
				x: mainBall.x,
				y: mainBall.y,
				v: { x: mainBall.v.x * Randombetween(0.2, 0.8), y: -mainBall.v.y * 2 * Math.random()},
				active: true,
				type: 'speedUp',
			};
			if (!this.state.bonusBalls)
				this.state.bonusBalls = [];
			if(rand > 0.8)
				newBall.type = 'fake';
			else if(rand > 0.6)
				newBall.type = 'shield';
			else if(rand > 0.4)
				newBall.type = 'bigger';
			this.state.bonusBalls.push(newBall);
		}
		this.state.timer++;
		// 3) Déplacement de la balle
		ball.x += ball.v.x * dt * this.ballspeedM;
		ball.y += ball.v.y * dt * this.ballspeedM;

		// rebond haut/bas
		if (ball.y - BALL_R <= 0) {
			ball.v.y = Math.abs(ball.v.y); // Force vers le bas
			ball.y = BALL_R; // Positionne JUSTE en dessous du bord
				} else if (ball.y + BALL_R >= GAME_HEIGHT) {
			ball.v.y = -Math.abs(ball.v.y); // Force vers le haut
			ball.y = GAME_HEIGHT - BALL_R; // Positionne JUSTE au-dessus du bord
				}

		for (const b of this.state.bonusBalls || [])
		{
			b.x += b.v.x * dt;
			b.y += b.v.y * dt;

			    if (b.y - BALL_R <= 0) {
					b.v.y = Math.abs(b.v.y);
					b.y = BALL_R;
				}
				else if (b.y + BALL_R >= GAME_HEIGHT) {
					b.v.y = -Math.abs(b.v.y);
					b.y = GAME_HEIGHT - BALL_R;
				}

			for (const player of this.state.players)
			{
				const paddleY = player.paddle.y;
				const paddleX = player.side === 'left' ? 0 : GAME_WIDTH - PADDLE_W;					
				if (b.x > paddleX && b.x < paddleX + player.paddle.w && b.y > paddleY && b.y < paddleY + player.paddle.h)
				{
					b.active = false;
					this.applyBonus(player.side, b.type);

					// dont await, db can wait, game cant
					fetch('http://game_service:3001/api/games/applyBonus', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							id: this.gameId,
							playerisLeft: (player.side === 'left'),
							bonus: b.type,
						}),
					});
				}
			}
			
		}
		for (const player of this.state.players)
			this.removepower(player);

		for (const pball of this.state.phantomBalls || [])
		{
			pball.x += pball.v.x * dt;
			pball.y += pball.v.y * dt;

			// Collision haut/bas avec correction de position
			if (pball.y - BALL_R <= 0) {
				pball.v.y = Math.abs(pball.v.y); // Force vers le bas
				pball.y = BALL_R; // Positionne JUSTE en dessous du bord
			}
			else if (pball.y + BALL_R >= GAME_HEIGHT) {
				pball.v.y = -Math.abs(pball.v.y); // Force vers le haut
				pball.y = GAME_HEIGHT - BALL_R; // Positionne JUSTE au-dessus du bord
			}

			// Collision gauche/droite (inchangée mais corrigeable si besoin)
			if (pball.x - BALL_R <= 0 || pball.x + BALL_R >= GAME_WIDTH) {
				pball.v.x *= -1;
			}
		}

		this.state.bonusBalls = (this.state.bonusBalls || []).filter(b => b.active);
		// Paddle collision with angle based on hit position
		const maxBounceAngle = Math.PI / 4; // 45 degrees
		// Left paddle
		if (ball.x - BALL_R <= PADDLE_W)
		{
			left.cpttch++;
			// dont await, db can wait, game cant
			fetch('http://game_service:3001/api/games/block', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: this.gameId,
					playerisLeft: (true)
				}),
			});

			const py = left.paddle.y;
			if (ball.y >= py && ball.y <= py + left.paddle.h)
			{
				// Compute normalized intersection [-1..1]
				const paddleCenter = py + left.paddle.h / 2;
				const relativeY = (ball.y - paddleCenter) / (left.paddle.h / 2);

				const clamped = Math.max(-1, Math.min(relativeY, 1));
				const bounceAngle = clamped * maxBounceAngle;
				// Preserve speed magnitude
				const speedMag = Math.hypot(ball.v.x, ball.v.y);
				ball.v.x =	speedMag * Math.cos(bounceAngle);
				ball.v.y =	speedMag * Math.sin(bounceAngle);
				this.ballspeedM *= BALL_XLR;
			}
			else if (left.power.includes("s"))
			{
				const speedMag = Math.hypot(ball.v.x, ball.v.y);
				ball.v.x = speedMag;
				ball.v.y = 0;
				left.power = left.power.replace(/s/g, ""); // supprime tous les shields
			}
		}
		// Right paddle
		if (ball.x + BALL_R >= GAME_WIDTH - PADDLE_W)
		{
			right.cpttch++;
			// dont await, db can wait, game cant
			fetch('http://game_service:3001/api/games/block', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					id: this.gameId,
					playerisLeft: (false)
				}),
			});
			

			const py = right.paddle.y;
			if (ball.y >= py && ball.y <= py + right.paddle.h)
			{
				// Compute normalized intersection [-1..1]
				const paddleCenter = py + right.paddle.h / 2;
				const relativeY = (ball.y - paddleCenter) / (right.paddle.h / 2);

				const clamped = Math.max(-1, Math.min(relativeY, 1));
				const bounceAngle = clamped * maxBounceAngle;
				// Preserve speed magnitude
				const speedMag = Math.hypot(ball.v.x, ball.v.y);
				ball.v.x = -speedMag * Math.cos(bounceAngle);
				ball.v.y =	speedMag * Math.sin(bounceAngle);
				this.ballspeedM *= BALL_XLR;
			}
			else if (right.power.includes("s"))
			{
				const speedMag = Math.hypot(ball.v.x, ball.v.y);
				ball.v.x = -speedMag;
				ball.v.y = 0;
				right.power = right.power.replace(/s/g, ""); // supprime tous les shields
			}
		}
		// 4) Score et fin de manche
        if (ball.x < 0) {
            // Right player scores
			await this.addScore(pgClient, false);
            right.score++;
            // Update scoring streaks
            const scorer = right.id;
            const other = left.id;
            if (this.lastScorerId === scorer) {
                this.streaks[scorer] += 1;
            } else {
                this.streaks[scorer] = 1;
                this.streaks[other] = 0;
            }
            this.lastScorerId = scorer;
            resetBall(ball, -this.speed);
			this.ballspeedM = 1;
        }
        if (ball.x > GAME_WIDTH) {
            // Left player scores
            left.score++;
            // Update scoring streaks
			await this.addScore(pgClient, true);
            const scorer = left.id;
            const other = right.id;
            if (this.lastScorerId === scorer) {
                this.streaks[scorer] += 1;
            } else {
                this.streaks[scorer] = 1;
                this.streaks[other] = 0;
            }
            this.lastScorerId = scorer;
            resetBall(ball, this.speed);
			this.ballspeedM = 1;
        }
		// 5) Fin de partie ?
		if (left.score >= 7 || right.score >= 7)
		{
			this.state.isGameOver = true;
			this.state.winner = left.score > right.score ? 'left' : 'right';
			const winner: boolean = (this.state.winner === 'left');
			
			// If this is a tournament game, notify the tournament_service
			if (this.gameId) {
				fetch('http://tournament_service:3000/api/tournaments/game/end', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						gameId: this.gameId,
						winnerSide: winner
					}),
				}).catch(err => console.error('Failed to notify tournament_service:', err));
			}
		}
	}
    /**
     * Return current game state, augmented with per-player stats
     */
    getState(): GameState {
        const s = this.state;
        const secondsLeft = this.countdownTicks > 0 ? Math.ceil(this.countdownTicks / 60) : 0;
        return {
            ...s,
            // Seconds remaining before game starts
            countdown: secondsLeft,
            players: [
                {
                    ...s.players[0],
                    powerUpsUsed: this.powerUpsUsed[s.players[0].id] || 0,
                    distanceMoved: this.distanceMoved[s.players[0].id] || 0,
                    streak: this.streaks[s.players[0].id] || 0,
                },
                {
                    ...s.players[1],
                    powerUpsUsed: this.powerUpsUsed[s.players[1].id] || 0,
                    distanceMoved: this.distanceMoved[s.players[1].id] || 0,
                    streak: this.streaks[s.players[1].id] || 0,
                }
            ]
        };
    }

	  public joinPlayer(newId: string, newDbId: number) {
    // Replace the right-side player id to disable AI movement
    const right = this.state.players[1];
    right.id = newId;
    right.dbId = newDbId;
	}
}




// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────
function clamp(v: number, min: number, max: number)
{
	return Math.max(min, Math.min(max, v));
}

function resetBall(ball: any, newVx: number)
{
	ball.x = GAME_WIDTH / 2;
	ball.y = GAME_HEIGHT / 2;
	ball.v.x = newVx;
	ball.v.y = (Math.random() * 0.6 - 0.3) * Math.abs(newVx);
}
function Randombetween(a: number, b:number) : number
{
	let rand: number = 0
	while(rand < a || rand > b)
		rand = Math.random()
	return(rand)
}