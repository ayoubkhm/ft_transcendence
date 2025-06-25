export default async function validateUserData(req: any, res: any) {
    const { email, name } = req.body || {};
    try {
        if (!email || !name || email.length > 50 || name.length > 20) {
            throw new Error('Invalid input data');
        }
        if (typeof email !== 'string' || typeof name !== 'string') {
            throw new Error('Invalid data types');
        }
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            throw new Error('Invalid email format');
        }
        if (!name.match(/^[a-zA-Z0-9_]+$/)) {
            throw new Error('Invalid name format');
        }
    } catch (error) {
        console.error('Validation error:', error);
        return res.status(500).send({ error: 'Internal server error' });
    }
        // Additional validation logic can be added here
}