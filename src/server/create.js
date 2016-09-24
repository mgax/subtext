import express from 'express'
import identityServer from './identityserver.js'
import cron from './cron.js'
import getConfig from './getConfig.js'

export default async function main() {
  let env = process.env
  let varPath = getConfig(env, 'SUBTEXT_VAR',
      "path to a directory where subtext can save its database")
  let publicUrl = getConfig(env, 'SUBTEXT_PUBLIC_URL',
      "the URL where subtext will be accessible")
  let authToken = getConfig(env, 'SUBTEXT_AUTH_TOKEN',
      "passphrase that will be required to log into the UI")
  let server = await identityServer(varPath, publicUrl, authToken)
  let app = express()
  app.use(server.createApp())
  let http = app.listen(+(process.env.PORT || 8000), 'localhost')
  server.createWebsocket(http)
  cron(server)
  return { app, server, http }
}
