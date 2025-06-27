// ── pong-server/game.ts ───────────────────────────────────────────────────
import {
  GAME_WIDTH, GAME_HEIGHT,
  PADDLE_H, PADDLE_W, BALL_R,
  GameState, ClientInput, Ball, BonusBall,
  POWER_UPV, POWER_UPB
} from './types.js';
import { aiPaddleMove } from './ai/index.js';




// AI difficulty levels
type AIDifficulty = 'easy' | 'medium' | 'hard';
export class Game
{
	private state: GameState;
	private readonly speed       = 400; // ball speed (px/s)
	private paddleSpeed = 340; // player paddle speed (px/s)
	private readonly aiSpeed     = 100; // base AI paddle speed (px/s)
	private readonly aiDifficulty: AIDifficulty;

	constructor(leftId: string, rightId: string /* "AI" for solo */, aiDifficulty: AIDifficulty = 'medium')
	{

		this.aiDifficulty = aiDifficulty;
		this.state =
		{
			ball:
			{
				x: GAME_WIDTH / 2,
				y: GAME_HEIGHT / 2,
				v: { x: this.speed, y: this.speed * 0.5 }
			},
			players:
			[
				{
				speedMultiplier: 1,
				i: 0,
				power:"",
				cpttch: 0,
				cpttime: [],
				id: leftId,
				side: 'left',
				paddle: { y: GAME_HEIGHT / 2 - PADDLE_H / 2, dy: 0, w : PADDLE_W, h: PADDLE_H},
				score: 0
				},
				{
				speedMultiplier: 1,
				i: 0,
				power:"",
				cpttch: 0,
				cpttime: [],
				id: rightId,
				side: 'right',
				paddle: { y: GAME_HEIGHT / 2 - PADDLE_H / 2, dy: 0, w : PADDLE_W, h: PADDLE_H},
				score: 0
				}
			],
			isCustomon: true,
			bonusBalls: [],
			timer : 0
		};
	}

	// ────────────────────────────────────────────────────────────────────────
	// GESTION DES INPUTS JOUEUR HUMAIN
	// ────────────────────────────────────────────────────────────────────────
	handleInput(id: string, msg: ClientInput)
	{
		const p = this.state.players.find(pl => pl.id === id);
		if (!p)
			return;
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
				else if (type === "i")
					player.speedMultiplier *= -1;
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
		switch (type)
		{
			case 'speedUp':
				player.speedMultiplier = POWER_UPV;
				player.power += "v";
				break;
			case 'invert':
				if (!player.power.includes("i"))
				{
					player.speedMultiplier *= -1;
					player.power += "i";
				}
				player.cpttime[player.power.indexOf("i")] = this.state.timer;
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
	step(dt: number)
	{
		const [left, right] = this.state.players;
		const ball = this.state.ball;
		this.state.isCustomon = true;
		// 1) Déplacement des paddles humains
		for (const pl of this.state.players)
		{
			// IA ne bouge pas ici
			if (pl.id !== 'AI')
			{
				pl.paddle.y += pl.paddle.dy * dt;
				pl.paddle.y = clamp(pl.paddle.y, 0, GAME_HEIGHT - pl.paddle.h);
			}
		}

		// 2) AI paddle movement (right side)
		let randomPowerup : number;
		if (right.id === 'AI')
		{
			// Determine AI speed and noise based on difficulty
			let speedMul = 1;
			switch (this.aiDifficulty)
			{
				case 'easy':
					speedMul = 0.9;
					break;
				case 'medium':
					speedMul = 1;
					break;
				case 'hard':
					speedMul = 1;
					break;
			}
			// Compute effective AI speed and noise per difficulty
			const effectiveSpeed = this.aiSpeed * speedMul;
			// Move AI paddle
			right.paddle.y = aiPaddleMove(right.paddle, ball, effectiveSpeed, dt);
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
				type: 'shield',
			};
			if (!this.state.bonusBalls)
				this.state.bonusBalls = [];
			if(rand > 0.8)
				newBall.type = 'fake';
			else if(rand > 0.6)
				newBall.type = 'shield';
			else if(rand > 0.4)
				newBall.type = 'bigger';
			else if(rand > 0.2)
				newBall.type = 'invert';
			this.state.bonusBalls.push(newBall);
		}
		this.state.timer++;
		// 3) Déplacement de la balle
		ball.x += ball.v.x * dt;
		ball.y += ball.v.y * dt;

		// rebond haut/bas
		if (ball.y - BALL_R <= 0 || ball.y + BALL_R >= GAME_HEIGHT)
			ball.v.y *= -1;

		for (const b of this.state.bonusBalls || [])
		{
			b.x += b.v.x * dt;
			b.y += b.v.y * dt;

			if (b.y - BALL_R <= 0 || b.y + BALL_R >= GAME_HEIGHT)
				b.v.y *= -1;

			for (const player of this.state.players)
			{
				const paddleY = player.paddle.y;
				const paddleX = player.side === 'left' ? 0 : GAME_WIDTH - PADDLE_W;					
				if (b.x > paddleX && b.x < paddleX + player.paddle.w && b.y > paddleY && b.y < paddleY + player.paddle.h)
				{
					b.active = false;
					this.applyBonus(player.side, b.type);
				}
				
			}
			
		}
		for (const player of this.state.players)
			this.removepower(player);

		for (const pball of this.state.phantomBalls || [])
		{
			pball.x += pball.v.x * dt;
			pball.y += pball.v.y * dt;

			if (pball.y - BALL_R <= 0 || pball.y + BALL_R >= GAME_HEIGHT)
				pball.v.y *= -1;

			if (pball.x - BALL_R <= 0 || pball.x + BALL_R >= GAME_WIDTH)
				pball.v.x *= -1;
		}

		this.state.bonusBalls = (this.state.bonusBalls || []).filter(b => b.active);
		// Paddle collision with angle based on hit position
		const maxBounceAngle = Math.PI / 4; // 45 degrees
		// Left paddle
		if (ball.x - BALL_R <= PADDLE_W)
		{
			left.cpttch++;
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
		if (ball.x < 0)
		{
			right.score++;
			resetBall(ball, -this.speed);
		}
		if (ball.x > GAME_WIDTH)
		{
			left.score++;
			resetBall(ball,	this.speed);
		}
		// 5) Fin de partie ?
		if (left.score >= 7 || right.score >= 7)
		{
			this.state.isGameOver = true;
			this.state.winner = left.score > right.score ? 'left' : 'right';
		}
	}
	getState(): GameState { return this.state; }

	  public joinPlayer(newId: string) {
    // Replace the right-side player id to disable AI movement
    const right = this.state.players[1];
    right.id = newId;
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