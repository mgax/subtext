import waiter from '../src/waiter.js'
import {devMiddleware, index} from '../src/build.js'
import createServer from '../src/server/create.js'

waiter((async function() {
  let { app } = await createServer()
  app.use(devMiddleware())
  app.get('/', function(req, res) { res.send(index()) })
})())
