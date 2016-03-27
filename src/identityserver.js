import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import SocketIO from 'socket.io'
import { openBox, boxId } from './messages.js'
import request from 'request'
import sqlite3 from 'sqlite3'
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

async function fetchProfile(profileUrl) {
  let res = await nodeAsync(request.get)(profileUrl, {json: true})
  return res.body
}

export default async function(identityPath, fetchProfile = fetchProfile) {
  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let { keyPair, publicUrl } = config
  let store = new Store()

  async function db(query, ...args) {
    let conn = await new Promise((resolve, reject) => {
      let db = new sqlite3.Database(identityPath + '/db.sqlite', (err) => {
        if(err) reject(err); else resolve(db)
      })
    })
    let rows = await new Promise((resolve, reject) => {
      conn.all(query, ...args, (err, rows) => {
        if(err) reject(err); else resolve(rows)
      })
    })
    return rows
  }

  async function receive({ box, from, to }) {

    if(to != publicUrl + '/profile') {
      return {error: "Message is not for me"}
    }

    let peer = await fetchProfile(from)

    try { openBox(box, keyPair.privateKey, peer.publicKey) } catch(e) {
      return {error: "Could not decrypt message"}
    }

    store.log(from, box)
    return {ok: true}

  }

  await db('CREATE TABLE IF NOT EXISTS peers ' +
    '(id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE, profile TEXT)')

  let publicApp = express()
  publicApp.use(bodyParser.json())

  let _wrap = (fn) => (...args) => fn(...args).catch(args[2])
  publicApp.get('/profile', (req, res) => {
    res.send({
      publicKey: keyPair.publicKey,
      inboxUrl: publicUrl + '/message',
    })
  })

  publicApp.post('/message', _wrap(async (req, res) => {
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

  let privateApp = express()
  privateApp.use(bodyParser.json())

  privateApp.post('/peers', _wrap(async (req, res) => {
    let peers = await db('SELECT * FROM peers')
    let profileUrl = req.body.profile
    let profile = await fetchProfile(profileUrl)
    await db('INSERT INTO peers(url, profile) VALUES (?, ?)',
      profileUrl, JSON.stringify(profile))
    res.send({ok: true})
  }))

  privateApp.get('/peers', _wrap(async (req, res) => {
    let rows = await db('SELECT * FROM peers')
    let peers = rows.map(({id, url, profile}) => ({
      id: id,
      url: url,
      profile: JSON.parse(profile),
    }))
    res.send({peers: peers})
  }))

  return { publicApp, privateApp, websocket }
}
