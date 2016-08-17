import url from 'url'
import fs from 'fs'
import express from 'express'
import waiter from '../src/waiter.js'
import {index} from '../src/build.js'
import createServer from '../src/server/create.js'

const BUILD = `${__dirname}/../build`
const UI_JS = process.env.SUBTEXT_UI_JS || 'ui.js'

function getUi() {
  return fs.readFileSync(`${BUILD}/ui.js`, 'utf8')
}

waiter((async function() {

  let [varPath, publicUrl, cmd] = process.argv.slice(2)

  let { app } = await createServer(varPath, publicUrl)

  app.get('/', function(req, res) { res.send(index()) })
  app.get('/ui.js', function(req, res) {
    res.set('Content-Type', 'application/javascript')
    res.send(getUi())
  })
  app.use(express.static(BUILD))

})())
