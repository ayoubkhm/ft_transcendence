import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import fp from 'fastify-plugin'
import oauthPlugin, { OAuth2Namespace } from '@fastify/oauth2'
import cookiesPlugin from '@fastify/cookie'

// Extend FastifyInstance to include googleOAuth2
declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

// OAuth service plugin: registers cookie and OAuth2, and internal routes
const oauthService: FastifyPluginAsync = async (app) => {
  // Skip registration if credentials are not set
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    app.log.warn('Skipping Google OAuth2 plugin: missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
    return
  }
  // Cookie plugin for state handling
  app.register(cookiesPlugin)
  // OAuth2 plugin for Google (auto-registers /login/google and its callback)
  app.register(oauthPlugin, {
    name: 'googleOAuth2',
    scope: ['profile', 'email'],
    credentials: {
      client: {
        id: process.env.GOOGLE_CLIENT_ID ?? '',
        secret: process.env.GOOGLE_CLIENT_SECRET ?? ''
      },
      auth: oauthPlugin.GOOGLE_CONFIGURATION
    },
    startRedirectPath: '/login/google',
    callbackUri: `${process.env.APP_URL || 'http://localhost:3000'}/api/auth/login/google/callback`,
    discovery: { issuer: 'https://accounts.google.com' },
    generateStateFunction: (request: FastifyRequest, _reply: FastifyReply) => {
      return (request.query as any).state
    },
    checkStateFunction: (request: FastifyRequest, callback: (err?: Error) => void) => {
      const state = (request.query as any).state
      if (state) {
        callback()
      } else {
        callback(new Error('Invalid state'))
      }
    }
  })
}

export default fp(oauthService, { name: 'oauth-service' })