import fastify from 'fastify'
import cookiesPlugin from '@fastify/cookie';
import private_userRoutes from './routes/private_data';
import fastifyPostgres from '@fastify/postgres';

const server = fastify();

server.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/mydb',
});
server.register(cookiesPlugin, {});
server.register(private_userRoutes, {
  prefix: '/api/user/',
});


server.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});