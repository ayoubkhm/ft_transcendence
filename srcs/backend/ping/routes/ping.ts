import { FastifyInstance } from 'fastify'

export default async function (app: FastifyInstance) {
  app.get('/ping', async () => {
    return { pong: 'it works!' }
  })
}