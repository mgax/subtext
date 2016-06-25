import fs from 'fs'
import EventEmitter from 'events'
import express from 'express'
import bodyParser from 'body-parser'
import SocketIO from 'socket.io'
import socketioAuth from 'socketio-auth'
import {createBox, openBox, boxId} from './messages.js'
import request from 'request'
import sqlite3 from 'sqlite3'
import nodeAsync from './nodeAsync.js'

async function defaultFetchCard(url) {
  let res = await nodeAsync(request.get)(url, {json: true})
  if(res.statusCode == 200) return res.body
  throw new Error(`Request to ${url} failed with code ${res.statusCode}`)
}

async function defaultSend(url, envelope) {
  let res = await nodeAsync(request.post)(url, {json: true, body: envelope})
  if(res.statusCode == 200) return res.body
  throw new Error(`Request to ${url} failed with code ${res.statusCode}`)
}

class IdentityServer {

  constructor(identityPath, fetchCard, send) {
    this.identityPath = identityPath
    this.fetchCard = fetchCard
    this.send = send

    this.config = JSON.parse(fs.readFileSync(this.identityPath + '/config.json'))
    this.keyPair = this.config.keyPair
    this.myPublicUrl = this.config.publicUrl + '/card'
    this.events = new EventEmitter()
  }

  async db(query, ...args) {
    let conn = await new Promise((resolve, reject) => {
      let db = new sqlite3.Database(this.identityPath + '/db.sqlite', (err) => {
        if(err) reject(err); else resolve(db)
      })
    })
    async function run(query, ...args) {
      return await new Promise((resolve, reject) => {
        conn.all(query, ...args, (err, rows) => {
          if(err) reject(err); else resolve(rows)
        })
      })
    }
    let rows = await run(query, ...args)
    rows.lastInsertId = async function() {
      let [{id}] = await run(`SELECT last_insert_rowid() as id`)
      return id
    }
    return rows
  }

  async prop(key, value) {
    if(value === undefined) {
      let res = await this.db(`SELECT value FROM prop WHERE key = ?`, key)
      if(res.length > 0) value = JSON.parse(res[0].value)
    }
    else {
      await this.db(`INSERT OR REPLACE INTO prop (key, value) VALUES (?, ?)`,
          key, JSON.stringify(value))
    }
    return value
  }

  async migrate() {
    await this.db(`CREATE TABLE IF NOT EXISTS prop (
        key TEXT UNIQUE,
        value TEXT
      )`)

    let dbVersion = await this.prop('dbVersion')
    switch(dbVersion) {

      case undefined:
        await this.db(`CREATE TABLE peer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            url TEXT UNIQUE,
            card TEXT
          )`)
        await this.db(`CREATE TABLE message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            peer_id INTEGER,
            time TEXT,
            me BOOL,
            message TEXT,
            unread BOOL,
            FOREIGN KEY(peer_id) REFERENCES peer(id)
          )`)
        await this.prop('dbVersion', 3)

      case 3:
        await this.db(`ALTER TABLE peer ADD COLUMN props TEXT`)
        await this.db(`UPDATE peer SET props = '{}'`)
        await this.prop('dbVersion', 4)

      case 4:
        return

      default:
        throw Error(`Unknown DB version ${dbVersion}`)

    }
  }

  loadPeer({card, props, ... row}) {
    return {
      ... row,
      card: JSON.parse(card),
      props: JSON.parse(props),
    }
  }

  async getPeer(id) {
    let [row] = await this.db('SELECT * FROM peer WHERE id = ?', id)
    return this.loadPeer(row)
  }

  async getPeerByUrl(url) {
    let [row] = await this.db('SELECT * FROM peer WHERE url = ?', url)
    if(row) return this.loadPeer(row)

    let card = await this.fetchCard(url)
    await this.db(`INSERT INTO peer(url, card, props) VALUES (?, ?, '{}')`,
      url, JSON.stringify(card))
    return this.getPeerByUrl(url)
  }

  async setPeerProps(peerId, props) {
    await this.db('UPDATE peer SET props = ? WHERE id = ?',
      JSON.stringify(props), peerId)
  }

  async updatePeerCard(peerId) {
    let peer = await this.getPeer(peerId)
    let card = await this.fetchCard(peer.url)
    await this.db('UPDATE peer SET card = ? WHERE id = ?',
      JSON.stringify(card), peerId)
  }

  async deletePeerById(id) {
    await this.db('DELETE FROM message WHERE peer_id = ?', id)
    await this.db('DELETE FROM peer WHERE id = ?', id)
  }

  async getPeersWithUnread() {
    let rows = await this.db(`SELECT peer_id FROM message
      WHERE unread = 1 GROUP BY peer_id`)
    return rows.map((row) => row.peer_id)
  }

  async receive({box, from, to}) {
    if(to != this.myPublicUrl) {
      return {error: "Message is not for me"}
    }

    let peer = await this.getPeerByUrl(from)

    let message
    try {
      message = openBox(box, this.keyPair.privateKey, peer.card.publicKey)
    }
    catch(e) { return {error: "Could not decrypt message"} }

    await this.saveMessage(peer.id, message, false)
    return {ok: true}
  }

  async saveMessage(peerId, message, me) {
    let res = await this.db(`INSERT INTO message(peer_id, time, me, message, unread)
      VALUES(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?, ?, ?)`,
      peerId, me, JSON.stringify(message), ! me)
    let id = await res.lastInsertId()
    let [row] = await this.db(`SELECT * FROM message WHERE id = ?`, id)
    this.events.emit('message', peerId, this.loadMessage(row))
  }

  loadMessage({message, me, unread, ... row}) {
    return {
      ... row,
      me: !! me,
      unread: !! unread,
      message: JSON.parse(message),
    }
  }

  async markAsRead(peerId) {
    await this.db(`UPDATE message SET unread = 0 WHERE peer_id = ? AND unread = 1`,
      peerId)
  }

  websocketConnection(socket) {
    function on(type, callback) {
      socket.on(type, async function(args, respond) {
        try {
          let res = await callback(... args)
          respond([null, res])
        }
        catch(err) {
          console.error(err.stack || err)
          respond([''+err])
        }
      })
    }

    let subscribe = (type) => {
      function handler() {
        socket.emit(type, ... arguments)
      }

      this.events.on(type, handler)

      socket.on('disconnect', () => {
        this.events.removeListener(type, handler)
      })
    }

    on('addPeer', async (url) => {
      return await this.getPeerByUrl(url)
    })

    on('deletePeer', async (peerId) => {
      await this.deletePeerById(peerId)
    })

    on('updatePeerCard', async (peerId) => {
      await this.updatePeerCard(peerId)
      return await this.getPeer(peerId)
    })

    on('setPeerProps', async (peerId, props) => {
      await this.setPeerProps(peerId, props)
    })

    on('getPeers', async () => {
      let rows = await this.db('SELECT * FROM peer')
      let peers = rows.map(this.loadPeer)
      return peers
    })

    on('sendMessage', async (peerId, message) => {
      let peer = await this.getPeer(peerId)
      let envelope = {
        type: 'Envelope',
        box: createBox(message, this.keyPair.privateKey, peer.card.publicKey),
        from: this.myPublicUrl,
        to: peer.url,
      }
      await this.saveMessage(peer.id, message, true)
      await this.send(peer.card.inboxUrl, envelope)
    })

    on('getMessages', async (peerId) => {
      let peer = await this.getPeer(peerId)
      let rows = await this.db(`SELECT * FROM message WHERE peer_id = ?
        ORDER BY id DESC LIMIT 10`, peer.id)
      return rows.map(this.loadMessage)
    })

    on('getPeersWithUnread', async () => {
      return await this.getPeersWithUnread()
    })

    on('markAsRead', async (peerId) => {
      await this.markAsRead(peerId)
      this.events.emit('markAsRead', peerId)
    })

    subscribe('message')

    subscribe('markAsRead')

  }

  websocket(server) {
    socketioAuth(SocketIO(server), {
      authenticate: (socket, token, cb) => {
        cb(null, token == this.config.authToken)
      },
      postAuthenticate: (sock) => {
        this.websocketConnection(sock)
      }
    })

    return server
  }

  createApp() {
    let {keyPair, publicUrl, name} = this.config

    let publicApp = express()
    publicApp.use(bodyParser.json())

    let _wrap = (fn) => (...args) => fn(...args).catch(args[2])
    publicApp.get('/card', (req, res) => {
      res.send({
        publicKey: keyPair.publicKey,
        inboxUrl: publicUrl + '/message',
        name: name,
      })
    })

    publicApp.post('/message', _wrap(async (req, res) => {
      let result = await this.receive(req.body)
      res.send(result)
    }))

    return publicApp
  }

}

export default async function(identityPath, fetchCard=defaultFetchCard, send=defaultSend) {
  let rv = new IdentityServer(identityPath, fetchCard, send)
  await rv.migrate()
  return rv
}
