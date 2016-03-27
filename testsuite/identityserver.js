import fs from 'fs'
import tmp from 'tmp'
import { assert } from 'chai'
import identityserver from '../src/identityserver.js'
import request from 'supertest'

const ALICE = {
  keyPair: {
    type: "KeyPair",
    publicKey: {
      type: "PublicKey",
      key: "YRgaMPzdZPAQiWFiiCggx5qppkN5LNsFTvuoXFF5kDA=",
    },
    privateKey: {
      type: "PrivateKey",
      key: "yjwWdAYTsOrUW12amKnT1J1R6TIu0FmjZ+JXCmzyW4A=",
    },
  },
  messageUrl: "http://localhost:8000/message",
}

function temporaryIdentity() {
  let tmpdir = tmp.dirSync({unsafeCleanup: true})

  fs.writeFileSync(tmpdir.name + '/config.json', JSON.stringify(ALICE))

  return {
    path: tmpdir.name,
    cleanup: tmpdir.removeCallback,
  }

}

function client(app) {
  return {
    get(url) {
      return new Promise((resolve, reject) => {
        request(app)
          .get(url)
          .expect('Content-Type', /^application\/json/)
          .expect(200)
          .end(function(err, res) {
            if(err) return reject(err)
            resolve(res)
          })
      })
    }
  }
}

describe('server', function() {

  before(function() {
    this.tmp = temporaryIdentity()
    this.app = identityserver(this.tmp.path).middleware
  })

  after(function() {
    this.tmp.cleanup()
  })

  it('should respond to finger', async function() {
    let { body } = await client(this.app).get('/finger')
    assert.equal(body.publicKey.key,
      'YRgaMPzdZPAQiWFiiCggx5qppkN5LNsFTvuoXFF5kDA=')
    assert.equal(body.messageUrl, ALICE.messageUrl)
  })

})
