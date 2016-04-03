import http from 'http'
import io from 'socket.io-client'
import {assert} from 'chai'
import {ALICE, BOB, temporaryIdentity} from './common.js'
import identityserver from '../src/identityserver.js'
import {openBox} from '../src/messages.js'

const PORT = 17604

class TestServer {

  constructor(websocket) {
    this.server = websocket(http.createServer())
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
    let profiles = {
      [BOB.publicUrl + '/profile']: {
        inboxUrl: BOB.publicUrl + '/message',
        publicKey: BOB.keyPair.publicKey,
      },
    }
    let sent = this.sent = []
    let fetchProfile = (url) => profiles[url]
    let send = (url, envelope) => { sent.push({url, envelope}) }
    this.tmp = temporaryIdentity(ALICE)
    let server = await identityserver(this.tmp.path, fetchProfile, send)
    this.http = new TestServer(server.websocket)
    await this.http.start()
    this.socket = new SocketClient()
    let rv = await this.socket.auth('--alice-token--')
  })

  afterEach(async function() {
    this.socket.disconnect()
    await this.http.stop()
    this.tmp.cleanup()
  })

  it('saves new peer', async function() {
    const bobUrl = 'http://bob.example.com/profile'
    const eveUrl = 'http://eve.example.com/profile'

    // add peer
    let peer = await this.socket.send('addPeer', bobUrl)
    assert.equal(peer.id, 1)
    assert.equal(peer.url, bobUrl)

    // add a different peer
    await this.socket.send('addPeer', eveUrl)

    // add bob again; operation should be idempotent
    let {id: bobId} = await this.socket.send('addPeer', bobUrl)

    // see what we have
    let peers = await this.socket.send('getPeers')
    let summary = peers.map(p => ({id: p.id, url: p.url}))
    assert.deepEqual(summary, [{id: 1, url: bobUrl}, {id: 2, url: eveUrl}])
    assert.equal(peers[0].profile.publicKey.key, BOB.keyPair.publicKey.key)

    // delete a peer
    await this.socket.send('deletePeer', bobId)
    let newPeers = await this.socket.send('getPeers')
    let newSummary = newPeers.map(p => ({id: p.id, url: p.url}))
    assert.deepEqual(newSummary, [{id: 2, url: eveUrl}])
  })

  it('sends message', async function() {
    const bobUrl = 'http://bob.example.com/profile'

    let notifications = []
    this.socket.on('message', (peerId, message) => {
      notifications.push({peerId, message})
    })

    let {id: bobId} = await this.socket.send('addPeer', bobUrl)
    let msg = {type: 'Message', text: "hi"}
    await this.socket.send('sendMessage', bobId, msg)

    let {url, envelope} = this.sent[0]
    assert.equal(url, BOB.publicUrl + '/message')
    assert.equal(envelope.to, bobUrl)
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

})
