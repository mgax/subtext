import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import { openBox } from './messages.js'

export default function(identityPath) {
  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let { keyPair, messageUrl } = config

  function receive({ box, from, to }) {
    if(to.key != keyPair.publicKey.key) return {error: "Message is not for me"}
    console.log(openBox(box, keyPair.privateKey, from))
    return {ok: true}
  }

  let app = express()
  app.use(bodyParser.json())

  app.get('/finger', (req, res) => {
    res.send({
      publicKey: keyPair.publicKey,
      messageUrl: messageUrl,
    })
  })

  app.post('/message', (req, res) => {
    let result = receive(req.body)
    res.send(result)
  })

  return app
}
