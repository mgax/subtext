import tmp from 'tmp'
import {assert} from 'chai'
import identityserver from '../src/server/identityserver.js'
import {ALICE, BOB, message} from './common.js'

describe('email notifications', function() {

  let minute = 60 * 1000

  beforeEach(async function() {
    let cards = {
      [BOB.publicUrl + '/card']: {
        inboxUrl: BOB.publicUrl + '/message',
        publicKey: BOB.keyPair.publicKey,
      },
    }
    this.tmp = tmp.dirSync({unsafeCleanup: true})
    this.inbox = []
    let sendMail = async ({text}) => { this.inbox.push(text) }
    let fetchCard = (url) => cards[url]
    let now = () => this.now
    this.identityServer = await identityserver(this.tmp.name, ALICE.publicUrl,
      ALICE.authToken, {fetchCard, sendMail, now})
    await this.identityServer.setKeyPair(ALICE.keyPair)
  })

  afterEach(function() {
    this.tmp.removeCallback()
  })

  it('sends notifications after 5 minutes', async function() {
    let t0 = new Date().getTime()
    let cronEmails = async () => {
      await this.identityServer.cron()
      let rv = this.inbox
      this.inbox = []
      return rv
    }

    this.now = t0
    await this.identityServer.receive(message(BOB, ALICE, 'one'))

    this.now = t0 + 1 * minute
    assert.deepEqual(await cronEmails(), [])

    this.now = t0 + 2 * minute
    await this.identityServer.receive(message(BOB, ALICE, 'two'))

    this.now = t0 + 3 * minute
    assert.deepEqual(await cronEmails(), [])

    this.now = t0 + 6 * minute
    // the messages are 6 and 4 minutes old; we send them both
    assert.deepEqual(await cronEmails(), ['You have 2 new messages.'])

    this.now = t0 + 12 * minute
    assert.deepEqual(await cronEmails(), [])
  })

})
