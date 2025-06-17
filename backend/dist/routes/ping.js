export default async function (app) {
    app.get('/ping', async () => {
        return { pong: 'it works!' };
    });
}
