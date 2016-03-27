import { assert } from 'chai'
import { ALICE, BOB, EVE, temporaryIdentity, client, message } from './common.js'
import identityserver from '../src/identityserver.js'

describe('public api', function() {

  before(async function() {
    let profiles = {
      [BOB.publicUrl + '/profile']: {publicKey: BOB.keyPair.publicKey},
    }
    let fetchProfile = (url) => profiles[url]
    this.tmp = temporaryIdentity(ALICE)
    let server = await identityserver(this.tmp.path, fetchProfile)
    this.app = server.publicApp
  })

  after(function() {
    this.tmp.cleanup()
  })

  it('responds to profile', async function() {
    let { body } = await client(this.app).get('/profile')
    assert.equal(body.publicKey.key,
      'YRgaMPzdZPAQiWFiiCggx5qppkN5LNsFTvuoXFF5kDA=')
    assert.equal(body.inboxUrl, 'http://alice.example.com/message')
  })

  it('accepts valid incoming message', async function() {
    let msg = message(BOB, ALICE, "hi")
    let { body } = await client(this.app).post('/message', msg)
    assert.isTrue(body.ok)
  })

  it('rejects message that is not for me', async function() {
    let msg = message(BOB, EVE, "hi")
    let { body } = await client(this.app).post('/message', msg)
    assert.equal(body.error, 'Message is not for me')
  })

  it('rejects message that does not decrypt', async function() {
    let msg = message(BOB, EVE, "hi")
    msg.to = ALICE.publicUrl + '/profile'
    let { body } = await client(this.app).post('/message', msg)
    assert.equal(body.error, 'Could not decrypt message')
  })

})
