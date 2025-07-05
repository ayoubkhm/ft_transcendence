import fastify from 'fastify'
import cookiesPlugin from '@fastify/cookie';
import private_userRoutes from './routes/private_data';
import fastifyPostgres from '@fastify/postgres';

// Trust proxy headers (e.g., X-Forwarded-Proto) when behind SSL termination
const server = fastify({ trustProxy: true });

server.register(fastifyPostgres, {
  connectionString: 'postgresql://transcendence:imthebest@database_service:5432/db',
});
server.register(cookiesPlugin, {});
server.register(private_userRoutes, {
  prefix: '/api/user',
});

server.listen({ host: '0.0.0.0', port: 3000 }, (err, address) =>
{
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(`ready`);
})