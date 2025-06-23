import { FastifyInstance } from "fastify";



export default async function private_userRoutes(server: FastifyInstance) {
        
    interface PrivateDataParams {
      email: string;
    }
  
    server.post<{ Params: PrivateDataParams }>('/lookup/:email', async (request, reply) => {
        // Simulate fetching private data
        
        const email = request.params.email;
        const isEmail = email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
        const isID = email.match(/^[0-9]$/);
        //check dans la db et post via reply
        return reply.send(email);
    });

    interface DataUserParams {
      email: string;
      name: string;
      password?: string;
      isAdmin?: boolean;}

    server.post<{ Body: DataUserParams }>('/create', async (request, reply) => {
        const email = request.body.email;
        const name = request.body.name;
        const password = request.body.password;
        const isAdmin = request.body.isAdmin;
        // Simulate creating user data
        if (!email || !name) {
            return reply.status(400).send({ error: 'Email and name are required' });
        }
        // Here you would typically save the user data to a database
        return reply.send({
            message: 'User data created successfully',
            user: {
                email: email,
                name: name,
                isAdmin: isAdmin || false,
                password: password || 'No password provided'
            }
            });
    });
}