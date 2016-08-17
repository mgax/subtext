import waiter from '../src/waiter.js'
import {devMiddleware, index} from '../src/build.js'
import createServer from '../src/server/create.js'

waiter((async function() {
  let path = process.argv[2]
  let publicUrl = process.argv[3]
  let { app } = await createServer(path, publicUrl)
  app.use(devMiddleware())
  app.get('/', function(req, res) { res.send(index()) })
})())
