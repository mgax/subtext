import url from 'url'
import fs from 'fs'
import express from 'express'
import waiter from '../src/waiter.js'
import {index} from '../src/build.js'
import createServer from '../src/server/create.js'

const BUILD = `${__dirname}/../build`

function getUi(customUi) {
  let uiUrl = url.resolve(`file://${BUILD}/ui.js`, customUi)
  let m = uiUrl.match(/^file:\/\/(.*)$/)
  console.log('loading', m[1])
  if(m) return fs.readFileSync(m[1], 'utf8')
  throw Error(`Can't read ui.js from "${uiUrl}"`)
}

waiter((async function() {

  let { app, server } = await createServer()
  app.get('/', function(req, res) { res.send(index()) })
  app.get('/vanilla', function(req, res) { res.send(index({vanilla: true})) })
  app.get('/ui.js', function(req, res) {
    let customUi = server.prop('customUi') || ''
    let uiUrl = req.query.vanilla == 'y' ? '' : customUi
    res.set('Content-Type', 'application/javascript')
    res.send(getUi(uiUrl))
  })
  app.use(express.static(BUILD))

})())
