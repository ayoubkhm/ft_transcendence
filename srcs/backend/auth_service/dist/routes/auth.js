"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
async function authRoutes(app) {
    // callback Google OAuth2
    app.get('/google/callback', async (req, reply) => {
        // 1) Exchange code → AccessToken object
        const oauthResult = await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(req);
        // 2) Récupère la vraie chaîne d’accès
        const accessToken = oauthResult.token.access_token;
        // 3) Signe le cookie et renvoie la réponse JSON
        reply
            .setCookie('session', accessToken, {
            httpOnly: true,
            maxAge: 60 * 60 * 24 * 7, // 7 jours
            path: '/',
            secure: process.env.NODE_ENV === 'production'
        })
            .send({
            ok: true,
            token: accessToken
        });
    });
}
