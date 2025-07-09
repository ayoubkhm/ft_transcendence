import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import jwt, { JwtPayload } from 'jsonwebtoken';
import bcrypt from 'bcrypt';

// Body for change password request
interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function changePasswordRoutes(app: FastifyInstance, options: any, done: any) {
  app.put<{ Body: ChangePasswordBody }>('/password', async (request, reply) => {
    try {
      const { currentPassword, newPassword, confirmPassword } = request.body;
      if (!currentPassword || !newPassword || !confirmPassword) {
        return reply.status(400).send({ error: 'All fields are required' });
      }
      if (newPassword !== confirmPassword) {
        return reply.status(400).send({ error: 'New passwords do not match' });
      }
      // Retrieve JWT from cookie
      const token = (request.cookies as Record<string, string>)['jwt_transcendance'];
      if (!token) {
        return reply.status(401).send({ error: 'Not authenticated' });
      }
      // Verify and extract user email
      let payload: any;
      try {
        payload = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
      } catch (err) {
        return reply.status(401).send({ error: 'Invalid session' });
      }
      const email = payload.data?.email;
      if (!email) {
        return reply.status(400).send({ error: 'Email not found in session' });
      }
      // Lookup user to get current password hash
      const lookupRes = await fetch(`http://user_service:3000/api/user/lookup/${email}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: process.env.API_CREDENTIAL }),
      });
      const lookupData = await lookupRes.json();
      if (!lookupRes.ok) {
        return reply.status(lookupRes.status).send({ error: lookupData.error });
      }
      // Verify current password
      const storedHash = lookupData.password;
      const match = await bcrypt.compare(currentPassword, storedHash);
      if (!match) {
        return reply.status(403).send({ error: 'Current password is incorrect' });
      }
      // Hash the new password
      const hashed = await bcrypt.hash(newPassword, 12);
      // Call user service to update the password
      const updateRes = await fetch(`http://user_service:3000/api/user/password/${email}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: process.env.API_CREDENTIAL, password: hashed }),
      });
      const updateData = await updateRes.json();
      if (!updateRes.ok) {
        return reply.status(updateRes.status).send({ error: updateData.error });
      }
      return reply.status(200).send({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
  done();
}