import jwt, {JwtPayload} from 'jsonwebtoken';
import {i_token} from '../utils/getTokenData';

export default function isConnected(request: any, reply: any, done: any) {
    const token = request.cookies.jwt_transcendance;
    if (!token || token === 'undefined') {
        return reply.code(401).send({error: 'Not authenticated'});
    }
    try {
        const decoded: i_token = (jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload).data;
        const id = decoded.id;
        if (!id) {
            return reply.code(401).send({error: 'Invalid token'});
        }
        const dfa = decoded.dfa;
        if (dfa === false) {
            return reply.code(403).send({error: 'Two-factor authentication required'});
        }
        done();
    } catch (err) {
        console.error('JWT verification error:', err);
        return reply.code(401).send({error: 'Invalid token'});
    }
    done();
}
