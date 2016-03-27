import { assert } from 'chai'
import { ALICE, BOB, temporaryIdentity, client } from './common.js'
import identityserver from '../src/identityserver.js'

describe('private api', function() {

  before(async function() {
    let profiles = {
      [BOB.publicUrl + '/profile']: {publicKey: BOB.keyPair.publicKey},
    }
    let lookupProfile = (url) => profiles[url]
    this.tmp = temporaryIdentity(ALICE)
    let server = await identityserver(this.tmp.path, lookupProfile)
    this.app = server.privateApp
  })

  after(function() {
    this.tmp.cleanup()
  })

  it('saves new peer', async function() {
    const bobUrl = 'http://bob.example.com/profile'
    const eveUrl = 'http://eve.example.com/profile'

    // add peer
    let { body: resp1 } = await client(this.app).post('/peers', {
      profile: bobUrl,
    })
    assert.isTrue(resp1.ok)

    // add a different peer
    let { body: resp2 } = await client(this.app).post('/peers', {
      profile: eveUrl,
    })
    assert.isTrue(resp2.ok)

    // see what we have
    let { body: resp } = await client(this.app).get('/peers')
    let summary = resp.peers.map(p => ({id: p.id, url: p.url}))
    assert.deepEqual(summary, [{id: 1, url: bobUrl}, {id: 2, url: eveUrl}])
    assert.equal(resp.peers[0].profile.publicKey.key, BOB.keyPair.publicKey.key)
  })

})
