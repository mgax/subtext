import fs from 'fs'
import url from 'url'
import EventEmitter from 'events'
import { createBox, openBox, keysEqual } from './messages.js'
import DB from './DB.js'
import PrivateApi from './PrivateApi.js'
import PublicApi from './PublicApi.js'

export default class Core {

  constructor(varPath, publicUrl, authToken, fetchCard, send, sendMail, now) {
    this.varPath = varPath
    this.publicUrl = publicUrl
    this.authToken = authToken
    this.fetchCard = fetchCard
    this.send = send
    this.sendMail = sendMail
    this.now = now

    this.myCardUrl = this.publicUrl + '/card'
    this.db = new DB(this.varPath + '/db.sqlite')
    this.events = new EventEmitter()
  }

  async initialize() {
    await this.db.initialize()
    this.keyPair = this.prop('keyPair')
  }

  prop(key) {
    return this.db.get_prop(key)
  }

  async setKeyPair(keyPair) {
    await this.db.set_prop('keyPair', keyPair)
    this.keyPair = keyPair
  }

  async setName(name) {
    await this.db.set_prop('name', name)
  }

  async setSmtp(smtp) {
    await this.db.set_prop('smtp', smtp)
  }

  async setCustomUi(url) {
    await this.db.set_prop('customUi', url)
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

    let card
    try {
      card = await this.fetchCard(url)
    }
    catch(e) {
      throw {type: 'CardDownloadError', message: ''+e, error: e}
    }
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
      `INSERT INTO message(peer_id, time, me, message, unread, notified)
      VALUES(?, ?, ?, ?, ?, 0)`,
      peerId, time, me, JSON.stringify(message), ! me)
    let id = await res.lastInsertId()
    let [row] = await this.db.run(`SELECT * FROM message WHERE id = ?`, id)
    this.events.emit('message', peerId, this.loadMessage(row))
    return id
  }

  loadMessage({message, me, unread, ... row}) {
    return {
      ... row,
      me: !! me,
      unread: !! unread,
      message: JSON.parse(message),
    }
  }

  async _writeToOutbox(messageId, destination, envelope) {
    let time = new Date(this.now()).toJSON()
    await this.db.run(`INSERT INTO outbox
      (message_id, last, destination, envelope)
      VALUES (?, ?, ?, ?)`,
      messageId, time, destination, JSON.stringify(envelope))
  }

  async _deliver(messageId) {
    let time = new Date(this.now()).toJSON()
    let [{destination, envelope}] = await this.db.run(`SELECT
      destination, envelope FROM outbox
      WHERE message_id = ?`, messageId)
    try {
      await this.send(destination, JSON.parse(envelope))
    }
    catch(_) {
      await this.db.run(`UPDATE outbox SET last = ? where message_id = ?`,
        time, messageId)
      return
    }
    await this.db.run(`DELETE FROM outbox WHERE message_id = ?`, messageId)
  }

  async sendMessage(peer, message) {
    let envelope = {
      type: 'Envelope',
      box: createBox(message, this.keyPair.privateKey, peer.card.publicKey),
      cardUrl: this.myCardUrl,
      from: this.keyPair.publicKey,
      to: peer.card.publicKey,
    }
    let messageId = await this.saveMessage(peer.id, message, true)
    await this._writeToOutbox(messageId, peer.card.inboxUrl, envelope)
    await this._deliver(messageId)
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

  async mail(text) {
    let smtp = this.prop('smtp')
    let host = url.parse(this.publicUrl).host
    let domain = host.split(':')[0]
    return await this.sendMail({text, smtp, domain})
  }

  async _cron_notifications() {
    let now = new Date(this.now()).toJSON()
    let messages
    await this.db.exclusive(async (run) => {
      let [{ due }] = await run(`SELECT count(*) as due
        FROM message
        WHERE unread
        AND not notified
        AND strftime('%s', ?) - strftime('%s', time) > 300`,
        now)
      if(! due) return
      [{ messages }] = await run(`SELECT count(*) as messages
        FROM message WHERE unread AND not notified`)
      await run(`UPDATE message SET notified=1 WHERE unread AND not notified`)
    })
    if(messages) await this.mail(`You have ${messages} new messages.`)
  }

  async _cron_outbox() {
    let now = new Date(this.now()).toJSON()
    let outbox = await this.db.run(`SELECT message_id FROM outbox
      WHERE strftime('%s', ?) - strftime('%s', last) > 30`, now)
    for(let {message_id} of outbox) {
      await this._deliver(message_id)
    }
  }

  async cron() {
    await this._cron_notifications()
    await this._cron_outbox()
  }

}
