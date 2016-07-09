import fs from 'fs'
import EventEmitter from 'events'
import { openBox, keysEqual } from './messages.js'
import DB from './DB.js'
import PrivateApi from './PrivateApi.js'
import PublicApi from './PublicApi.js'

export default class Core {

  constructor(varPath, publicUrl, authToken, fetchCard, send, now) {
    this.varPath = varPath
    this.publicUrl = publicUrl
    this.authToken = authToken
    this.fetchCard = fetchCard
    this.send = send
    this.now = now

    this.myCardUrl = this.publicUrl + '/card'
    this.db = new DB(this.varPath + '/db.sqlite')
    this.events = new EventEmitter()
  }

  async initialize() {
    await this.db.migrate()
    this.keyPair = await this.db.prop('keyPair')
  }

  async setKeyPair(keyPair) {
    await this.db.prop('keyPair', keyPair)
    this.keyPair = keyPair
  }

  async setName(name) {
    await this.db.prop('name', name)
  }

  loadPeer({card, props, ... row}) {
    return {
      ... row,
      card: JSON.parse(card),
      props: JSON.parse(props),
    }
  }

  async getPeer(id) {
    let [row] = await this.db.run('SELECT * FROM peer WHERE id = ?', id)
    return this.loadPeer(row)
  }

  async getPeerByUrl(url) {
    let [row] = await this.db.run('SELECT * FROM peer WHERE url = ?', url)
    if(row) return this.loadPeer(row)

    let card = await this.fetchCard(url)
    await this.db.run(`INSERT INTO peer(url, card, props) VALUES (?, ?, '{}')`,
      url, JSON.stringify(card))
    return this.getPeerByUrl(url)
  }

  async getPeerByPublicKey(publicKey) {
    let rows = await this.db.run(`SELECT id, card FROM peer`)
    for(let row of rows) {
      let card = JSON.parse(row.card)
      if(keysEqual(publicKey, card.publicKey)) {
        return await this.getPeer(row.id)
      }
    }
  }

  async setPeerProps(peerId, props) {
    await this.db.run('UPDATE peer SET props = ? WHERE id = ?',
      JSON.stringify(props), peerId)
  }

  async updatePeerCard(peerId) {
    let peer = await this.getPeer(peerId)
    let card = await this.fetchCard(peer.url)
    await this.db.run('UPDATE peer SET card = ? WHERE id = ?',
      JSON.stringify(card), peerId)
  }

  async deletePeerById(id) {
    await this.db.run('DELETE FROM message WHERE peer_id = ?', id)
    await this.db.run('DELETE FROM peer WHERE id = ?', id)
  }

  async getPeersWithUnread() {
    let rows = await this.db.run(`SELECT peer_id FROM message
      WHERE unread = 1 GROUP BY peer_id`)
    return rows.map((row) => row.peer_id)
  }

  async receive({box, cardUrl, from, to}) {
    if(! keysEqual(to, this.keyPair.publicKey)) {
      return {error: "Message is not for me"}
    }

    let peer = await this.getPeerByPublicKey(from)
    if(! peer) peer = await this.getPeerByUrl(cardUrl)

    let message
    try {
      message = openBox(box, this.keyPair.privateKey, peer.card.publicKey)
    }
    catch(e) { return {error: "Could not decrypt message"} }

    await this.saveMessage(peer.id, message, false)
    return {ok: true}
  }

  async saveMessage(peerId, message, me) {
    let time = new Date(this.now()).toJSON()
    let res = await this.db.run(
      `INSERT INTO message(peer_id, time, me, message, unread)
      VALUES(?, ?, ?, ?, ?)`,
      peerId, time, me, JSON.stringify(message), ! me)
    let id = await res.lastInsertId()
    let [row] = await this.db.run(`SELECT * FROM message WHERE id = ?`, id)
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
    await this.db.run(`UPDATE message SET unread = 0
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
