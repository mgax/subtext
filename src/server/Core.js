import fs from 'fs'
import EventEmitter from 'events'
import { openBox } from './messages.js'
import sqlite3 from 'sqlite3'
import PrivateApi from './PrivateApi.js'
import PublicApi from './PublicApi.js'

export default class Core {

  constructor(varPath, publicUrl, authToken, fetchCard, send) {
    this.varPath = varPath
    this.publicUrl = publicUrl
    this.authToken = authToken
    this.fetchCard = fetchCard
    this.send = send

    this.myPublicUrl = this.publicUrl + '/card'
    this.events = new EventEmitter()
  }

  async initialize() {
    await this.migrate()
    this.keyPair = await this.prop('keyPair')
  }

  async db(query, ...args) {
    let conn = await new Promise((resolve, reject) => {
      let db = new sqlite3.Database(this.varPath + '/db.sqlite', (err) => {
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

  async setKeyPair(keyPair) {
    await this.prop('keyPair', keyPair)
    this.keyPair = keyPair
  }

  async setName(name) {
    await this.prop('name', name)
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
    let res = await this.db(
      `INSERT INTO message(peer_id, time, me, message, unread)
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
    await this.db(`UPDATE message SET unread = 0
      WHERE peer_id = ? AND unread = 1`, peerId)
  }

  createWebsocket(server) {
    let privateApi = new PrivateApi(this)
    return privateApi.createWebsocket(server)
  }

  createApp() {
    let publicApi = new PublicApi(this)
    return publicApi.app
  }

}
