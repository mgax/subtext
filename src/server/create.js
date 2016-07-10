import express from 'express'
import identityServer from './identityserver.js'
import cron from './cron.js'

export default async function main(varPath, publicUrl) {
  let authToken = process.env.AUTH_TOKEN || ''
  let server = await identityServer(varPath, publicUrl, authToken)
  let app = express()
  app.use(server.createApp())
  let http = app.listen(+(process.env.PORT || 8000))
  server.createWebsocket(http)
  cron(server)
  return { app, server, http }
}
