import express from 'express'
import identityServer from './identityserver.js'
import cron from './cron.js'

function getConfig(env, name, message) {
  let value = env[name]
  if(value) return value
  console.error(`Missing environment variable ${name}: ${message}`)
  process.exit(1)
}

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
