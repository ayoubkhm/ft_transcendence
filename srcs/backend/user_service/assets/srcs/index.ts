import fastify from 'fastify';
import cookiesPlugin from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyPostgres from '@fastify/postgres';
import fastifyStatic from '@fastify/static';
import path from 'path';

import private_userRoutes from './routes/private_data';
import public_userRoutes from './routes/public_data';
import friendsRoutes from './routes/friends';
// import tournamentsRoutes from './routes/tournaments';
import fastifyPostgres from '@fastify/postgres';
/* import jwt from 'jsonwebtoken'; */

const server = fastify({ trustProxy: true });

const avatarsPath = path.join(__dirname, '../../public/avatars');
console.log('Serving static avatars from:', avatarsPath);

// Enregistre le plugin pour servir les fichiers statiques AVANT les routes
server.register(fastifyStatic, {
  root: path.join(__dirname, '../../public/avatars'), // chemin vers le dossier avatars
  prefix: '/avatars/', // correspond à l’URL /avatars/*
  // Optionnel : cacheControl, maxAge, etc.
});

server.register(multipart);
server.register(fastifyPostgres, {
  connectionString: 'postgresql://transcendence:imthebest@database_service:5432/db',
});
server.register(cookiesPlugin, {});
server.register(private_userRoutes, { prefix: '/api/user',});
server.register(public_userRoutes, { prefix: '/api/user',});
server.register(friendsRoutes, { prefix: '/api/user',});
// Tournament dashboard endpoints removed temporarily
// server.register(tournamentsRoutes, { prefix: '/api/tournaments' });
/* const SECRET = 'e4l+2nJoNiabS7MpIYdmzHTfs0ju5iy3xgg1o48+149NeJ4PXHzoIQ21THvoTgUGXbhF6mJYSJyU0EzEEcXiuw==';

const payload = {
  data: {
    id: 1,
    email: 'mehdimail',
    name: 'mehdi',
    isAdmin: false,
    twoFactorSecret: null,
    dfa: true
  }
};

const token = jwt.sign(payload, SECRET, { expiresIn: '24h' });
console.log(token); */

console.log(server.printRoutes());

server.listen({ host: '0.0.0.0', port: 3000 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server ready at ${address}`);
});
