import fs from 'fs'
import EventEmitter from 'events'
import express from 'express'
import bodyParser from 'body-parser'
import SocketIO from 'socket.io'
import {createBox, openBox, boxId} from './messages.js'
import request from 'request'
import sqlite3 from 'sqlite3'
import nodeAsync from './nodeAsync.js'

async function defaultFetchProfile(url) {
  let res = await nodeAsync(request.get)(url, {json: true})
  if(res.statusCode == 200) return res.body
  throw new Error(`Request to ${url} failed with code ${res.statusCode}`)
}

async function defaultSend(url, envelope) {
  let res = await nodeAsync(request.post)(url, {json: true, body: envelope})
  if(res.statusCode == 200) return res.body
  throw new Error(`Request to ${url} failed with code ${res.statusCode}`)
}

export default async function(identityPath, fetchProfile=defaultFetchProfile, send=defaultSend) {
  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let {keyPair, publicUrl} = config
  let myPublicUrl = publicUrl + '/profile'
  let events = new EventEmitter()

  async function db(query, ...args) {
    let conn = await new Promise((resolve, reject) => {
      let db = new sqlite3.Database(identityPath + '/db.sqlite', (err) => {
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

  async function getPeer(id) {
    let [{url, profile}] = await db('SELECT * FROM peer WHERE id = ?', id)
    return {id, url, profile: JSON.parse(profile)}
  }

  async function deletePeerById(id) {
    await db('DELETE FROM message WHERE peer_id = ?', id)
    await db('DELETE FROM peer WHERE id = ?', id)
  }

  async function receive({box, from, to}) {
    if(to != myPublicUrl) {
      return {error: "Message is not for me"}
    }

    let peer = await getPeerByUrl(from)

    let message
    try {
      message = openBox(box, keyPair.privateKey, peer.profile.publicKey)
    }
    catch(e) { return {error: "Could not decrypt message"} }

    await saveMessage(peer.id, message, false)
    return {ok: true}
  }

  await db(`CREATE TABLE IF NOT EXISTS prop (
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
            url TEXT UNIQUE, profile TEXT
          )`)
        await db(`CREATE TABLE message (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            peer_id INTEGER,
            time TEXT,
            me BOOL,
            message TEXT,
            FOREIGN KEY(peer_id) REFERENCES peer(id)
          )`)
        await prop('dbVersion', 1)

      case 1:
        console.log('DB upgrade 1 -> 2')
        await db(`ALTER TABLE message ADD COLUMN unread BOOL`)
        await prop('dbVersion', 2)

      case 2:
        return

      default:
        throw Error(`Unknown DB version ${dbVersion}`)

    }
  }

  await dbUpgrade()

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

      on('addPeer', async (url) => {
        return await getPeerByUrl(url)
      })

      on('deletePeer', async (peerId) => {
        await deletePeerById(peerId)
      })

      on('getPeers', async () => {
        let rows = await db('SELECT * FROM peer')
        let peers = rows.map(({id, url, profile}) => ({
          id: id,
          url: url,
          profile: JSON.parse(profile),
        }))
        return peers
      })

      on('sendMessage', async (peerId, message) => {
        let peer = await getPeer(peerId)
        let envelope = {
          type: 'Envelope',
          box: createBox(message, keyPair.privateKey, peer.profile.publicKey),
          from: myPublicUrl,
          to: peer.url,
        }
        await saveMessage(peer.id, message, true)
        await send(peer.profile.inboxUrl, envelope)
      })

      on('getMessages', async (peerId) => {
        let peer = await getPeer(peerId)
        let rows = await db(`SELECT * FROM message WHERE peer_id = ?
          ORDER BY id DESC LIMIT 10`, peer.id)
        return rows.map(loadMessage)
      })

      function notifyMessage(peerId, message) {
        socket.emit('message', peerId, message)
      }

      events.on('message', notifyMessage)

      socket.on('disconnect', () => {
        events.removeListener('message', notifyMessage)
      })

    })
    return server
  }

  async function saveMessage(peerId, message, me) {
    let res = await db(`INSERT INTO message(peer_id, time, me, message)
      VALUES(?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), ?, ?)`,
      peerId, me, JSON.stringify(message))
    let id = await res.lastInsertId()
    let [row] = await db(`SELECT * FROM message WHERE id = ?`, id)
    events.emit('message', peerId, loadMessage(row))
  }

  function loadMessage({message, me, ... row}) {
    return {
      ... row,
      me: !! me,
      message: JSON.parse(message),
    }
  }

  return {publicApp, websocket}
}
