import app from './app.js';

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
const host = process.env.HOST || '0.0.0.0';

const start = async () => {
  try {
    await app.listen({ port, host });
    console.log(`Game service listening on ${host}:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
