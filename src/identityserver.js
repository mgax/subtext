import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import SocketIO from 'socket.io'
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
  let { keyPair, publicUrl } = config
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

  app.get('/profile', (req, res) => {
    res.send({
      publicKey: keyPair.publicKey,
      inboxUrl: publicUrl + '/message',
    })
  })

  app.post('/message', (req, res) => {
    let result = receive(req.body)
    res.send(result)
  })

  function websocket(server) {
    SocketIO(server).on('connection', function(socket) {
      let authenticated = false

      socket.on('Authenticate', (privateKey) => {
        function respond(value) {
          socket.emit('AuthenticationResult', value)
        }

        try { if(privateKey.key != keyPair.privateKey.key) throw new Error }
        catch(e) { return respond({error: "invalid authentication key"}) }

        authenticated = true
        return respond({ok: true})
      })

    })
  }

  return {
    middleware: app,
    websocket: websocket,
  }
}
