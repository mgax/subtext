import tmp from 'tmp'
import {assert} from 'chai'
import {ALICE, BOB, EVE, client, message} from './common.js'
import identityserver from '../src/server/identityserver.js'

describe('public api', function() {

  before(async function() {
    let cards = {
      [BOB.publicUrl + '/card']: {publicKey: BOB.keyPair.publicKey},
    }
    let fetchCard = (url) => cards[url]
    this.tmp = tmp.dirSync({unsafeCleanup: true})
    let server = await identityserver(this.tmp.name, ALICE.publicUrl, '',
      fetchCard)
    await server.setKeyPair(ALICE.keyPair)
    await server.setName(ALICE.name)
    this.pub = client(server.createApp())
  })

  after(function() {
    this.tmp.removeCallback()
  })

  it('responds to card', async function() {
    let {body} = await this.pub.get('/card')
    assert.equal(body.publicKey.key,
      'YRgaMPzdZPAQiWFiiCggx5qppkN5LNsFTvuoXFF5kDA=')
    assert.equal(body.inboxUrl, 'http://alice.example.com/message')
    assert.equal(body.name, 'Alice')
  })

  it('accepts valid incoming message', async function() {
    let msg = message(BOB, ALICE, "hi")
    let {body} = await this.pub.post('/message', msg)
    assert.isTrue(body.ok)
  })

  it('rejects message that is not for me', async function() {
    let msg = message(BOB, EVE, "hi")
    let {body} = await this.pub.post('/message', msg)
    assert.equal(body.error, 'Message is not for me')
  })

  it('rejects message that does not decrypt', async function() {
    let msg = message(BOB, EVE, "hi")
    msg.to = ALICE.publicUrl + '/card'
    let {body} = await this.pub.post('/message', msg)
    assert.equal(body.error, 'Could not decrypt message')
  })

})
