import fs from 'fs'
import express from 'express'
import bodyParser from 'body-parser'
import SocketIO from 'socket.io'
import {createBox, openBox, boxId} from './messages.js'
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

async function send(url, envelope) {
  let res = await nodeAsync(request.post)(url, {json: true, body: envelope})
  return res.body
}

export default async function(identityPath, fetchProfile=fetchProfile, send=send) {
  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let {keyPair, publicUrl} = config
  let store = new Store()
  let myPublicUrl = publicUrl + '/profile'

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

  async function getPeerByUrl(url) {
    let [row] = await db('SELECT * FROM peer WHERE url = ?', url)
    if(row) {
      let {id, profile} = row
      profile = JSON.parse(profile)
      return {id, url, profile}
    }

    let profile = await fetchProfile(url)
    await db('INSERT INTO peer(url, profile) VALUES (?, ?)',
      url, JSON.stringify(profile))
    return getPeerByUrl(url)
  }

  async function receive({box, from, to }) {

    if(to != myPublicUrl) {
      return {error: "Message is not for me"}
    }

    let peer = await getPeerByUrl(from)

    try { openBox(box, keyPair.privateKey, peer.profile.publicKey) } catch(e) {
      return {error: "Could not decrypt message"}
    }

    store.log(from, box)
    return {ok: true}

  }

  await db(`CREATE TABLE IF NOT EXISTS peer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE, profile TEXT
    )`)

  await db(`CREATE TABLE IF NOT EXISTS message (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peer_id INTEGER,
      time TEXT,
      message TEXT,
      FOREIGN KEY(peer_id) REFERENCES peer(id)
    )`)

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
    await getPeerByUrl(req.body.profile)
    res.send({ok: true})
  }))

  privateApp.get('/peers', _wrap(async (req, res) => {
    let rows = await db('SELECT * FROM peer')
    let peers = rows.map(({id, url, profile}) => ({
      id: id,
      url: url,
      profile: JSON.parse(profile),
    }))
    res.send({peers: peers})
  }))

  async function getPeerById(id) {
    let [{url, profile}] = await db('SELECT * FROM peer WHERE id = ?', id)
    profile = JSON.parse(profile)
    return {id, url, profile}
  }

  async function saveMessage(peer, message) {
    await db(`INSERT INTO message(peer_id, message, time)
      VALUES(?, ?, datetime())`,
      peer, JSON.stringify(message))
  }

  privateApp.post('/peers/:id/messages', _wrap(async (req, res) => {
    let peer = await getPeerById(+req.params.id)
    let message = req.body
    let envelope = {
      type: 'Envelope',
      box: createBox(message, keyPair.privateKey, peer.profile.publicKey),
      from: myPublicUrl,
      to: peer.url,
    }
    saveMessage(peer.id, message)
    send(peer.profile.inboxUrl, envelope)
    res.send({ok: true})
  }))

  privateApp.get('/peers/:id/messages', _wrap(async (req, res) => {
    let peer = await getPeerById(+req.params.id)
    let rows = await db(`SELECT * FROM message WHERE peer_id = ?
      ORDER BY id DESC LIMIT 10`, peer.id)
    let messages = rows.map(({id, message, time}) => ({
      id: id,
      time: time,
      message: JSON.parse(message),
    }))
    res.send({messages: messages})
  }))

  return {publicApp, privateApp, websocket}
}
