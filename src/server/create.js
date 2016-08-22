import express from 'express'
import identityServer from './identityserver.js'
import cron from './cron.js'

function bail(text) {
  console.error(text)
  process.exit(1)
}

export default async function main() {
  let varPath = process.env.SUBTEXT_VAR
  if(! varPath) bail("Please set SUBTEXT_VAR to a directory where subtext "
      + "can save its database.")
  let publicUrl = process.env.SUBTEXT_PUBLIC_URL
  if(! publicUrl) bail("Please set SUBTEXT_PUBLIC_URL to the URL where "
      + "subtext will be accessible.")
  let authToken = process.env.SUBTEXT_AUTH_TOKEN
  if(! authToken) bail("Please set SUBTEXT_AUTH_TOKEN. Make it a good "
      + "passphrase.")
  let server = await identityServer(varPath, publicUrl, authToken)
  let app = express()
  app.use(server.createApp())
  let http = app.listen(+(process.env.PORT || 8000))
  server.createWebsocket(http)
  cron(server)
  return { app, server, http }
}
