import fastify from 'fastify'
import cookiesPlugin from '@fastify/cookie';
import private_userRoutes from './routes/private_data';

const server = fastify();

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