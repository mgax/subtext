import url from 'url'
import fs from 'fs'
import express from 'express'
import waiter from '../src/waiter.js'
import {index} from '../src/build.js'
import createServer from '../src/server/create.js'
import getConfig from '../src/server/getConfig.js'

function getUi(customUi) {
  let uiJsPath = getConfig(process.env,
    'SUBTEXT_UI_JS', "path to default ui.js")
  let uiUrl = url.resolve(`file://${uiJsPath}`, customUi)
  let m = uiUrl.match(/^file:\/\/(.*)$/)
  console.log('loading', m[1])
  if(m) return fs.readFileSync(m[1], 'utf8')
  throw Error(`Can't read ui.js from "${uiUrl}"`)
}

waiter((async function() {

  let { app, server } = await createServer()
  app.get('/', function(req, res) {
    res.send(index({dev: false}))
  })
  app.get('/vanilla', function(req, res) {
    res.send(index({dev: false, vanilla: true}))
  })
  app.get('/ui.js', function(req, res) {
    let customUi = server.prop('customUi') || ''
    let uiUrl = req.query.vanilla == 'y' ? '' : customUi
    res.set('Content-Type', 'application/javascript')
    res.send(getUi(uiUrl))
  })

})())
