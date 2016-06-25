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

  async initialize(identityPath, fetchCard, send) {
    this.identityPath = identityPath
    this.fetchCard = fetchCard
    let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
    let {keyPair, publicUrl, authToken} = config
    let myPublicUrl = publicUrl + '/card'
    let events = new EventEmitter()

    let db = this.db.bind(this)
    let getPeer = this.getPeer.bind(this)
    let getPeerByUrl = this.getPeerByUrl.bind(this)
    let loadPeer = this.loadPeer.bind(this)

    async function updatePeerCard(peerId) {
      let peer = await getPeer(peerId)
      let card = await fetchCard(peer.url)
      await db('UPDATE peer SET card = ? WHERE id = ?',
        JSON.stringify(card), peerId)
    }

    async function setPeerProps(peerId, props) {
      await db('UPDATE peer SET props = ? WHERE id = ?',
        JSON.stringify(props), peerId)
    }

    async function deletePeerById(id) {
      await db('DELETE FROM message WHERE peer_id = ?', id)
      await db('DELETE FROM peer WHERE id = ?', id)
    }

    async function getPeersWithUnread() {
      let rows = await db(`SELECT peer_id FROM message
        WHERE unread = 1 GROUP BY peer_id`)
      return rows.map((row) => row.peer_id)
    }

    async function markAsRead(peerId) {
      await db(`UPDATE message SET unread = 0 WHERE peer_id = ? AND unread = 1`,
        peerId)
    }

    async function receive({box, from, to}) {
      if(to != myPublicUrl) {
        return {error: "Message is not for me"}
      }

      let peer = await getPeerByUrl(from)

      let message
      try {
        message = openBox(box, keyPair.privateKey, peer.card.publicKey)
      }
      catch(e) { return {error: "Could not decrypt message"} }

      await saveMessage(peer.id, message, false)
      return {ok: true}
    }

    await this.db(`CREATE TABLE IF NOT EXISTS prop (
        key TEXT UNIQUE,
        value TEXT
      )`)

    async function prop(key, value) {
      if(value === undefined) {
        let res = await db(`SELECT value FROM prop WHERE key = ?`, key)
        if(res.length > 0) value = JSON.parse(res[0].value)
      }
      else {
        await db(`INSERT OR REPLACE INTO prop (key, value) VALUES (?, ?)`,
            key, JSON.stringify(value))
      }
      return value
    }

    async function dbUpgrade() {
      let dbVersion = await prop('dbVersion')
      switch(dbVersion) {

        case undefined:
          await db(`CREATE TABLE peer (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              url TEXT UNIQUE,
              card TEXT
            )`)
          await db(`CREATE TABLE message (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              peer_id INTEGER,
              time TEXT,
              me BOOL,
              message TEXT,
              unread BOOL,
              FOREIGN KEY(peer_id) REFERENCES peer(id)
            )`)
          await prop('dbVersion', 3)

        case 3:
          await db(`ALTER TABLE peer ADD COLUMN props TEXT`)
          await db(`UPDATE peer SET props = '{}'`)
          await prop('dbVersion', 4)

        case 4:
          return

        default:
          throw Error(`Unknown DB version ${dbVersion}`)

      }
    }

    await dbUpgrade()

    let publicApp = express()
    publicApp.use(bodyParser.json())

    let _wrap = (fn) => (...args) => fn(...args).catch(args[2])
    publicApp.get('/card', (req, res) => {
      res.send({
        publicKey: keyPair.publicKey,
        inboxUrl: publicUrl + '/message',
        name: config.name,
      })
    })

    publicApp.post('/message', _wrap(async (req, res) => {
      let result = await receive(req.body)
      res.send(result)
    }))

    function websocket(server) {
      socketioAuth(SocketIO(server), {
        authenticate: (socket, token, cb) => { cb(null, token == authToken) },
        postAuthenticate: connection,
      })

      function connection(socket) {

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

        function subscribe(type) {
          function handler() {
            socket.emit(type, ... arguments)
          }

          events.on(type, handler)

          socket.on('disconnect', () => {
            events.removeListener(type, handler)
          })
        }

        on('addPeer', async (url) => {
          return await getPeerByUrl(url)
        })

        on('deletePeer', async (peerId) => {
          await deletePeerById(peerId)
        })

        on('updatePeerCard', async (peerId) => {
          await updatePeerCard(peerId)
          return await getPeer(peerId)
        })

        on('setPeerProps', async (peerId, props) => {
          await setPeerProps(peerId, props)
        })

        on('getPeers', async () => {
          let rows = await db('SELECT * FROM peer')
          let peers = rows.map(loadPeer)
          return peers
        })

        on('sendMessage', async (peerId, message) => {
          let peer = await getPeer(peerId)
          let envelope = {
            type: 'Envelope',
            box: createBox(message, keyPair.privateKey, peer.card.publicKey),
            from: myPublicUrl,
            to: peer.url,
          }
          await saveMessage(peer.id, message, true)
          await send(peer.card.inboxUrl, envelope)
        })

        on('getMessages', async (peerId) => {
          let peer = await getPeer(peerId)
          let rows = await db(`SELECT * FROM message WHERE peer_id = ?
            ORDER BY id DESC LIMIT 10`, peer.id)
          return rows.map(loadMessage)
        })

        on('getPeersWithUnread', async () => {
          return await getPeersWithUnread()
        })

        on('markAsRead', async (peerId) => {
          await markAsRead(peerId)
          events.emit('markAsRead', peerId)
        })

        subscribe('message')

        subscribe('markAsRead')

      }

      return server
    }

    async function saveMessage(peerId, message, me) {
      let res = await db(`INSERT INTO message(peer_id, time, me, message, unread)
        VALUES(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?, ?, ?)`,
        peerId, me, JSON.stringify(message), ! me)
      let id = await res.lastInsertId()
      let [row] = await db(`SELECT * FROM message WHERE id = ?`, id)
      events.emit('message', peerId, loadMessage(row))
    }

    function loadMessage({message, me, unread, ... row}) {
      return {
        ... row,
        me: !! me,
        unread: !! unread,
        message: JSON.parse(message),
      }
    }

    this.publicApp = publicApp
    this.websocket = websocket
  }

}

export default async function(identityPath, fetchCard=defaultFetchCard, send=defaultSend) {
  let rv = new IdentityServer()
  await rv.initialize(identityPath, fetchCard, send)
  return rv
}
