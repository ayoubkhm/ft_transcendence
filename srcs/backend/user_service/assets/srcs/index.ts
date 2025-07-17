import fastify from 'fastify';
import cookiesPlugin from '@fastify/cookie';
import multipart from '@fastify/multipart';
import fastifyPostgres from '@fastify/postgres';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';

import private_userRoutes from './routes/private_data';
import public_userRoutes from './routes/public_data';
import friendsRoutes from './routes/friends';
import statusRoutes from './routes/status';
// import tournamentsRoutes from './routes/tournaments';
/* import jwt from 'jsonwebtoken'; */

const server = fastify({ trustProxy: true });

// Serve avatar files from the container's /usr/src/avatar directory
const avatarsPath = '/usr/src/avatar';
// Ensure the avatars directory exists
fs.mkdirSync(avatarsPath, { recursive: true });
console.log('Serving static avatars from:', avatarsPath);

// Enregistre le plugin pour servir les fichiers statiques AVANT les routes
// Register static file serving for avatars (must come before routes)
// Serve avatars under the same API namespace so it passes through Nginx /api/user proxy
server.register(fastifyStatic, {
  root: avatarsPath,          // serves files under public/avatars
  prefix: '/api/user/avatars/', // URL /api/user/avatars/*
  // Optionally configure cacheControl, maxAge, etc.
});

server.register(multipart);
server.register(fastifyPostgres, {
  connectionString: process.env.DATABASE_URL,
});

server.register(cookiesPlugin, {});
server.register(private_userRoutes, { prefix: '/api/user',});
server.register(public_userRoutes, { prefix: '/api/user',});
server.register(friendsRoutes, { prefix: '/api/user',});
server.register(statusRoutes, { prefix: '/api/user',});
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
