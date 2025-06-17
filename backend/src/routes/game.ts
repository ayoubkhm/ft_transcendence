import { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import { Game } from '../services/game/game.js'
import type { ClientInput, GameState } from '../services/game/types.js'

// In-memory store of active game sessions and their simulation loops
interface GameSession {
  game: Game
  interval: NodeJS.Timer
}
const sessions = new Map<string, GameSession>()

export default async function (app: FastifyInstance) {
  // Create a new solo game (player vs AI)
  app.post('/game', async (request, reply) => {
    const playerId = randomUUID()
    const gameId = randomUUID()
    const game = new Game(playerId, 'AI')
    // Start game simulation at ~60fps
    const interval = setInterval(() => {
      const state: GameState = game.getState()
      if (!state.isGameOver) {
        game.step(1 / 60)
      } else {
        clearInterval(interval)
      }
    }, 1000 / 60)
    sessions.set(gameId, { game, interval })
    return { gameId, playerId }
  })

  // Submit player input to an existing game
  app.post('/game/:id/input', async (request, reply) => {
    const { id } = request.params as { id: string }
    const payload = request.body as ClientInput & { playerId: string }
    const session = sessions.get(id)
    if (!session) {
      reply.code(404)
      return { error: 'Game not found' }
    }
    const { playerId, type, ts } = payload
    // Apply input to the game
    session.game.handleInput(playerId, { type, ts })
    return { ok: true }
  })

  // Get current game state
  app.get('/game/:id/state', async (request, reply) => {
    const { id } = request.params as { id: string }
    const session = sessions.get(id)
    if (!session) {
      reply.code(404)
      return { error: 'Game not found' }
    }
    const state: GameState = session.game.getState()
    return state
  })
}