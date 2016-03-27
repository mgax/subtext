import {assert} from 'chai'
import {ALICE, BOB, temporaryIdentity, client} from './common.js'
import identityserver from '../src/identityserver.js'
import {openBox} from '../src/messages.js'

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
    this.ui = client(server.privateApp)
  })

  afterEach(function() {
    this.tmp.cleanup()
  })

  it('saves new peer', async function() {
    const bobUrl = 'http://bob.example.com/profile'
    const eveUrl = 'http://eve.example.com/profile'

    // add peer
    let {body: resp1} = await this.ui.post('/peers', {
      profile: bobUrl,
    })
    assert.isTrue(resp1.ok)

    // add a different peer
    let {body: resp2} = await this.ui.post('/peers', {
      profile: eveUrl,
    })
    assert.isTrue(resp2.ok)

    // add bob again; operation should be idempotent
    let {body: resp3} = await this.ui.post('/peers', {
      profile: bobUrl,
    })
    assert.isTrue(resp3.ok)

    // see what we have
    let {body: resp} = await this.ui.get('/peers')
    let summary = resp.peers.map(p => ({id: p.id, url: p.url}))
    assert.deepEqual(summary, [{id: 1, url: bobUrl}, {id: 2, url: eveUrl}])
    assert.equal(resp.peers[0].profile.publicKey.key, BOB.keyPair.publicKey.key)
  })

  it('sends message', async function() {
    await this.ui.post('/peers', {profile: BOB.publicUrl + '/profile'})
    let msg = {type: 'Message', text: "hi"}
    let {body: resp1} = await this.ui.post('/peers/1/messages', msg)

    let {url, envelope} = this.sent[0]
    assert.equal(url, BOB.publicUrl + '/message')
    assert.equal(envelope.to, BOB.publicUrl + '/profile')
    let boxedMessage = openBox(envelope.box,
      BOB.keyPair.privateKey, ALICE.keyPair.publicKey)
    assert.deepEqual(boxedMessage, msg)

    let {body: resp2} = await this.ui.get('/peers/1/messages')
    assert.deepEqual(resp2.messages[0].message, msg)
  })

})
