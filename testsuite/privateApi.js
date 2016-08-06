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
    this.inbox = []
    this.smtpErr = null
    let sendMail = async ({text}) => {
      if(this.smtpErr) throw(this.smtpErr)
      this.inbox.push(text)
      return true
    }
    let fetchCard = (url) => cards[url]
    let send = (url, envelope) => {
      if(this.sendFail) throw "SEND FAIL"
      else sent.push({url, envelope})
    }
    let now = () => this.now || new Date().getTime()
    this.tmp = tmp.dirSync({unsafeCleanup: true})
    this.identityServer = await identityserver(this.tmp.name, ALICE.publicUrl,
      ALICE.authToken, {fetchCard, send, sendMail, now})
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

  it('gets and updates name', async function() {
    let getNameAndKeyPair = async () => {
      let {name, hasKeyPair} = await this.socket.send('getConfig')
      return {name, hasKeyPair}
    }
    await this.identityServer.setName(null)
    await this.identityServer.setKeyPair(null)
    assert.deepEqual(await getNameAndKeyPair(), {
      name: null,
      hasKeyPair: false,
    })
    await this.socket.send('setName', 'Alice')
    await this.socket.send('generateKeyPair')
    assert.deepEqual(await getNameAndKeyPair(), {
      name: "Alice",
      hasKeyPair: true,
    })
  })

  it('gets and updates smtp', async function() {
    let getSmtp = async () => (await this.socket.send('getConfig')).smtp
    const smtp = {
      server: 'smtp.example.com',
      port: 2525,
      from: 'subtext@example.com',
      to: 'me@example.com',
    }
    assert.isUndefined(await getSmtp())
    await this.socket.send('setSmtp', smtp)
    assert.deepEqual(await getSmtp(), smtp)
  })

  it('gets card url', async function() {
    let myCardUrl = (await this.socket.send('getConfig')).myCardUrl
    assert.equal(myCardUrl, 'http://alice.example.com/card')
  })

  it('performs an smtp test', async function() {
    let checkInbox = () => { let rv = this.inbox; this.inbox = []; return rv }
    assert.deepEqual(await this.socket.send('testSmtp'), {success: true})
    assert.deepEqual(checkInbox(), ['smtp test'])
    this.smtpErr = 'some error'
    assert.deepEqual(await this.socket.send('testSmtp'),
      {success: false, err: 'some error'})
    assert.deepEqual(checkInbox(), [])
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

    // get a peer by id
    let peer1 = await this.socket.send('getPeer', 1)
    assert.deepEqual(peers[0], peer1)

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

  it('retries sending the message', async function() {
    let t0 = new Date().getTime()
    let minute = 60 * 1000
    const bobUrl = 'http://bob.example.com/card'

    let {id: bobId} = await this.socket.send('addPeer', bobUrl)
    let msg = {type: 'Message', text: "hi"}

    this.now = t0
    this.sendFail = true
    await this.socket.send('sendMessage', bobId, msg)
    assert.equal(this.sent.length, 0)

    this.now = t0 + 1 * minute
    await this.identityServer.cron()
    assert.equal(this.sent.length, 0)

    this.sendFail = false
    await this.identityServer.cron()
    assert.equal(this.sent.length, 0)

    this.now = t0 + 2 * minute
    await this.identityServer.cron()
    assert.equal(this.sent.length, 1)

    this.now = t0 + 3 * minute
    await this.identityServer.cron()
    assert.equal(this.sent.length, 1)
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
