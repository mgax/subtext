import express from 'express'
import identityServer from './src/identityserver.js'

async function main() {
  let varPath = process.argv[2]
  let config = fs.readFileSync(varPath + '/config.json')
  let authToken = process.env.AUTH_TOKEN || ''
  let identity = await identityServer(varPath, config.publicUrl, authToken)
  let app = express()
  app.use(identity.createApp())
  app.use(express.static(`${__dirname}/build`))
  let server = app.listen(+(process.env.PORT || 8000))
  identity.createWebsocket(server)
}

main().catch((e) => { console.error(e.stack || e) })
