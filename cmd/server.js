import express from 'express'
import waiter from '../src/waiter.js'
import createServer from '../src/server/create.js'

waiter((async function() {

  let [varPath, publicUrl, cmd] = process.argv.slice(2)

  let { app } = await createServer(varPath, publicUrl)

  app.use(express.static(`${__dirname}/build`))

})())
