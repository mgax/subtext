import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import { openBox, boxId } from './messages.js'

class Store {

  constructor() {
    this.conversations = {}
  }

  log(peer, box) {
    let messages = this.conversations[peer.key]
    if(! messages) messages = this.conversations[peer.key] = []
    let logEntry = {
      type: 'LogEntry',
      id: boxId(box),
      from: peer,
      box: box,
    }
    messages.push(logEntry)
  }

}

export default function(identityPath) {
  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let { keyPair, messageUrl } = config
  let store = new Store()

  function receive({ box, from, to }) {

    if(to.key != keyPair.publicKey.key) {
      return {error: "Message is not for me"}
    }

    try { openBox(box, keyPair.privateKey, from) } catch(e) {
      return {error: "Could not decrypt message"}
    }

    store.log(from, box)
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
