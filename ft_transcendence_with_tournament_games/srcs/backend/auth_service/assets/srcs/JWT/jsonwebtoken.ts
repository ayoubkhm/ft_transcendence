import jwt, { JwtPayload } from 'jsonwebtoken';
import { i_token } from '../utils/getTokenData';
import { getVaultClient } from './vaultClient';

let jwtSecret: string | null = null;

async function loadJwtSecret() {
  if (jwtSecret) return;

  // First, allow direct env var override (e.g., in development)
  if (process.env.JWT_SECRET) {
    jwtSecret = process.env.JWT_SECRET;
    console.log('✅ JWT secret loaded from environment variable');
    return;
  }

  // Attempt to load from Vault
  try {
    const vaultClient = await getVaultClient();
    const secretData = await vaultClient.read('secret/data/jwt');
    jwtSecret = secretData.data.data.secret;
    if (!jwtSecret) {
      throw new Error('JWT secret missing in Vault data');
    }
    console.log('✅ JWT secret loaded from Vault');
  } catch (err: any) {
    console.error('⚠️ Failed to load JWT secret from Vault:', err.message || err);
    // If env var not set and Vault failed, cannot proceed
    throw err;
  }
}

// À appeler au démarrage du service pour charger la clé
export async function initJwt() {
  await loadJwtSecret();
}

// Middleware Fastify pour vérifier que l'utilisateur est connecté
export default function isConnected(request: any, reply: any, done: any) {
  if (!jwtSecret) {
    return reply.code(500).send({ error: 'JWT secret not initialized' });
  }

  const token = request.cookies['jwt_transcendence'];
  if (!token || token === 'undefined') {
    return reply.code(401).send({ error: 'Not authenticated' });
  }

  try {
    const decoded: i_token = (jwt.verify(token, jwtSecret) as JwtPayload).data;
    console.log("CACA");
    console.log('JWT decoded:', decoded);
    const id = decoded.id;
    if (!id) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
    const dfa = decoded.dfa;
    console.log('DFA status:', dfa);
    if (dfa === false) {
      return reply.code(403).send({ error: 'Two-factor authentication required' });
    }
    done();
  } catch (err) {
    console.error('JWT verification error:', err);
    return reply.code(401).send({ error: 'Invalid token' });
  }
  done();
}

// Pour accéder à la clé JWT dans d'autres modules si besoin
export function getJwtSecret(): string | null {
  return jwtSecret;
}