import express from 'express'
import identityServer from './src/identityserver.js'

async function main() {
  let identity = await identityServer(process.argv[2])
  let app = express()
  app.use(identity.createApp())
  app.use(express.static(`${__dirname}/build`))
  let server = app.listen(+(process.env.PORT || 8000))
  identity.createWebsocket(server)
}

main().catch((e) => { console.error(e.stack || e) })
