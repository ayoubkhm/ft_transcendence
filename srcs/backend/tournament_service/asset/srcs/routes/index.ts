
import { FastifyInstance } from 'fastify';
import createTournament from './create';
import getTournament from './get';
import startTournament from './start';
import deleteTournament from './delete';
import endGame from './endGame';
import leaveTournament from './leave';

export default function httpRoutes(server: FastifyInstance, options: any, done: () => void) {
  createTournament(server);
  getTournament(server);
  startTournament(server);
  deleteTournament(server);
  endGame(server);
  leaveTournament(server);

  done();
}
