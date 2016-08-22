import express from 'express'
import identityServer from './identityserver.js'
import cron from './cron.js'

function bail(text) {
  console.error(text)
  process.exit(1)
}

const pleaseSetAuthToken =
  "Please set SUBTEXT_AUTH_TOKEN. " +
  "Make it a good passphrase."

export default async function main() {
  let varPath = process.env.SUBTEXT_VAR
  let publicUrl = process.env.SUBTEXT_PUBLIC_URL
  let authToken = process.env.SUBTEXT_AUTH_TOKEN
  if(! authToken) bail(pleaseSetAuthToken)
  let server = await identityServer(varPath, publicUrl, authToken)
  let app = express()
  app.use(server.createApp())
  let http = app.listen(+(process.env.PORT || 8000))
  server.createWebsocket(http)
  cron(server)
  return { app, server, http }
}
