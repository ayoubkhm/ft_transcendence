import fastify from 'fastify'
import cookiesPlugin from '@fastify/cookie';
import multipart from '@fastify/multipart';
import private_userRoutes from './routes/private_data';
import public_userRoutes from './routes/public_data';
import friendsRoutes from './routes/friends';
// import tournamentsRoutes from './routes/tournaments';
import fastifyPostgres from '@fastify/postgres';

// Trust proxy headers (e.g., X-Forwarded-Proto) when behind SSL termination
const server = fastify({ trustProxy: true });

server.register(multipart);
server.register(fastifyPostgres, {
  // TODO: replace value db
  connectionString: 'postgresql://transcendence:imthebest@database_service:5432/db',
});
server.register(cookiesPlugin, {});
server.register(private_userRoutes, { prefix: '/api/user',});
server.register(public_userRoutes, { prefix: '/api/user',});
server.register(friendsRoutes, { prefix: '/api/user',});
// Tournament dashboard endpoints removed temporarily
// server.register(tournamentsRoutes, { prefix: '/api/tournaments' });

console.log(server.printRoutes());

server.listen({ host: '0.0.0.0', port: 3000 }, (err, address) =>
{
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`ready`);
})