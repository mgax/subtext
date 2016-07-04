import http from 'http'
import io from 'socket.io-client'
import tmp from 'tmp'
import {assert} from 'chai'
import {ALICE, BOB, client, message} from './common.js'
import identityserver from '../src/server/identityserver.js'
import {openBox, keysEqual} from '../src/server/messages.js'

const PORT = 17604

class TestServer {

  constructor(identityServer) {
    this.server = identityServer.createWebsocket(http.createServer())
  }

  start() {
    return new Promise((resolve) => { this.server.listen(PORT, resolve) })
  }

  stop() {
    return new Promise((resolve) => { this.server.close(resolve) })
  }

}

class SocketClient {

  constructor() {
    this.socket = io.connect(`http://localhost:${PORT}`)
  }

  auth(token) {
    this.socket.emit('authentication', token)
    return new Promise((r) => { this.socket.on('authenticated', r) })
  }

  async send(type, ... args) {
    let [err, res] = await new Promise((resolve) => {
      this.socket.emit(type, args, resolve)
    })
    if(err) throw new Error(err)
    return res
  }

  on(type, callback) {
    this.socket.on(type, callback)
  }

  disconnect() {
    this.socket.disconnect()
  }

}

describe('private api', function() {

  beforeEach(async function() {
    let cards = {
      [BOB.publicUrl + '/card']: {
        inboxUrl: BOB.publicUrl + '/message',
        publicKey: BOB.keyPair.publicKey,
      },
    }
    let sent = this.sent = []
    let fetchCard = (url) => cards[url]
    let send = (url, envelope) => { sent.push({url, envelope}) }
    this.tmp = tmp.dirSync({unsafeCleanup: true})
    this.identityServer = await identityserver(this.tmp.name, ALICE.publicUrl,
      ALICE.authToken, fetchCard, send)
    await this.identityServer.setKeyPair(ALICE.keyPair)
    await this.identityServer.setName(ALICE.name)
    this.http = new TestServer(this.identityServer)
    await this.http.start()
    this.socket = new SocketClient()
    this.pub = client(this.identityServer.createApp())
    let rv = await this.socket.auth('--alice-token--')
  })

  afterEach(async function() {
    this.socket.disconnect()
    await this.http.stop()
    this.tmp.removeCallback()
  })

  it('gets and updates config', async function() {
    await this.identityServer.setName(null)
    await this.identityServer.setKeyPair(null)
    assert.deepEqual(await this.socket.send('getConfig'), {
      name: null,
      hasKeyPair: false,
    })
    await this.socket.send('setName', 'Alice')
    await this.socket.send('generateKeyPair')
    assert.deepEqual(await this.socket.send('getConfig'), {
      name: "Alice",
      hasKeyPair: true,
    })
  })

  it('saves new peer', async function() {
    const bobUrl = 'http://bob.example.com/card'
    const eveUrl = 'http://eve.example.com/card'

    // add peer
    let peer = await this.socket.send('addPeer', bobUrl)
    assert.equal(peer.id, 1)
    assert.equal(peer.url, bobUrl)

    // add a different peer
    await this.socket.send('addPeer', eveUrl)

    // add bob again; operation should be idempotent
    let {id: bobId} = await this.socket.send('addPeer', bobUrl)

    // edit peer props
    await this.socket.send('setPeerProps', 2, {foo: 'bar'})

    // see what we have
    let peers = await this.socket.send('getPeers')
    let summary = peers.map(p => ({id: p.id, url: p.url, props: p.props}))
    assert.deepEqual(summary, [
      {id: 1, url: bobUrl, props: {}},
      {id: 2, url: eveUrl, props: {foo: 'bar'}},
    ])
    assert.equal(peers[0].card.publicKey.key, BOB.keyPair.publicKey.key)

    // delete a peer
    await this.socket.send('deletePeer', bobId)
    let newPeers = await this.socket.send('getPeers')
    let newSummary = newPeers.map(p => ({id: p.id, url: p.url}))
    assert.deepEqual(newSummary, [{id: 2, url: eveUrl}])
  })

  it('sends message', async function() {
    const bobUrl = 'http://bob.example.com/card'

    let notifications = []
    this.socket.on('message', (peerId, message) => {
      notifications.push({peerId, message})
    })

    let {id: bobId} = await this.socket.send('addPeer', bobUrl)
    let msg = {type: 'Message', text: "hi"}
    await this.socket.send('sendMessage', bobId, msg)

    let {url, envelope} = this.sent[0]
    assert.equal(url, BOB.publicUrl + '/message')
    assert.isTrue(keysEqual(envelope.to, BOB.keyPair.publicKey))
    let boxedMessage = openBox(envelope.box,
      BOB.keyPair.privateKey, ALICE.keyPair.publicKey)
    assert.deepEqual(boxedMessage, msg)

    let messages = await this.socket.send('getMessages', bobId)
    assert.deepEqual(messages[0].message, msg)
    assert.isTrue(messages[0].me)

    assert.equal(notifications[0].peerId, 1)
    assert.deepEqual(notifications[0].message.message, msg)
    assert.isTrue(notifications[0].message.me)
  })

  it('keeps track of unread messages', async function() {
    let notifications = []
    this.socket.on('markAsRead', (peerId) => {
      notifications.push(peerId)
    })

    await this.pub.post('/message', message(BOB, ALICE, "hi"))

    let peerIds = await this.socket.send('getPeersWithUnread')
    assert.deepEqual(peerIds, [1])

    await this.socket.send('markAsRead', 1)

    let peerIds2 = await this.socket.send('getPeersWithUnread')
    assert.deepEqual(peerIds2, [])
    assert.deepEqual(notifications, [1])
  })

})
