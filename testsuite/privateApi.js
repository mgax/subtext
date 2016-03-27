import {assert} from 'chai'
import {ALICE, BOB, temporaryIdentity, client} from './common.js'
import identityserver from '../src/identityserver.js'

describe('private api', function() {

  before(async function() {
    let profiles = {
      [BOB.publicUrl + '/profile']: {publicKey: BOB.keyPair.publicKey},
    }
    let fetchProfile = (url) => profiles[url]
    this.tmp = temporaryIdentity(ALICE)
    let server = await identityserver(this.tmp.path, fetchProfile)
    this.ui = client(server.privateApp)
  })

  after(function() {
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

})
