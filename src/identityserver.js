import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'

export default function(identityPath) {
  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let app = express()
  app.use(bodyParser.json())

  app.get('/finger', (req, res) => {
    res.send({
      publicKey: config.keyPair.publicKey,
      messageUrl: config.messageUrl,
    })
  })

  app.post('/message', (req, res) => {
    console.log(req.body)
    res.send({ok: true})
  })

  return app
}
