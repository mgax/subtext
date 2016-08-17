import url from 'url'
import fs from 'fs'
import express from 'express'
import waiter from '../src/waiter.js'
import {index} from '../src/build.js'
import createServer from '../src/server/create.js'

const BUILD = `${__dirname}/../build`
const UI_JS = process.env.SUBTEXT_UI_JS || 'ui.js'

function getUi(customUi) {
  let uiUrl = url.resolve(`file://${BUILD}/ui.js`, customUi)
  let m = uiUrl.match(/^file:\/\/(.*)$/)
  if(m) return fs.readFileSync(m[1], 'utf8')
  throw Error(`Can't read ui.js from "${uiUrl}"`)
}

waiter((async function() {

  let [varPath, publicUrl, cmd] = process.argv.slice(2)

  let { app, server } = await createServer(varPath, publicUrl)

  app.get('/', function(req, res) { res.send(index()) })
  app.get('/ui.js', function(req, res) {
    res.set('Content-Type', 'application/javascript')
    let customUi = server.prop('customUi') || ''
    res.send(getUi(customUi))
  })
  app.use(express.static(BUILD))

})())
