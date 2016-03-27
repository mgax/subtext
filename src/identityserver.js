import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import SocketIO from 'socket.io'
import { openBox, boxId } from './messages.js'
import request from 'request'
import nodeAsync from './nodeAsync.js'

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

async function lookupProfile(profileUrl) {
  let res = await nodeAsync(request.get)(profileUrl, {json: true})
  return res.body
}

export default function(identityPath, lookupProfile = lookupProfile) {
  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let { keyPair, publicUrl } = config
  let store = new Store()

  async function receive({ box, from, to }) {

    if(to != publicUrl + '/profile') {
      return {error: "Message is not for me"}
    }

    let peer = await lookupProfile(from)

    try { openBox(box, keyPair.privateKey, peer.publicKey) } catch(e) {
      return {error: "Could not decrypt message"}
    }

    store.log(from, box)
    return {ok: true}

  }

  let app = express()
  app.use(bodyParser.json())

  let _wrap = (fn) => (...args) => fn(...args).catch(args[2])
  app.get('/profile', (req, res) => {
    res.send({
      publicKey: keyPair.publicKey,
      inboxUrl: publicUrl + '/message',
    })
  })

  app.post('/message', _wrap(async (req, res) => {
    let result = await receive(req.body)
    res.send(result)
  }))

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
