import fs from 'fs'
import tmp from 'tmp'
import { assert } from 'chai'
import identityserver from '../src/identityserver.js'
import { createBox } from '../src/messages.js'
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

const BOB = {
  keyPair: {
    type: "KeyPair",
    publicKey: {
      type: "PublicKey",
      key: "UExBa+Qt9BfVFCfJoBWLyzNPpGkgTPEGKLxdDQwxNhY=",
    },
    privateKey: {
      type: "PrivateKey",
      key: "0ghwEILbUNJ8rCiSFWRv4aMqZxDfzvpgQ6/Pp2K+v2g=",
    },
  },
}

const EVE = {
  keyPair: {
    type: "KeyPair",
    publicKey: {
      type: "PublicKey",
      key: "k/IqAX11Yd+iunc+6gbTk+kmxorNXBydDV6muc21FEM=",
    },
    privateKey: {
      type: "PrivateKey",
      key: "ikS/vxtoiM8u9VUoDTROsEaKEQrbSwwySO9ZiXE8dg8=",
    },
  },
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
    },

    post(url, body) {
      return new Promise((resolve, reject) => {
        request(app)
          .post(url)
          .send(body)
          .expect('Content-Type', /^application\/json/)
          .expect(200)
          .end(function(err, res) {
            if(err) return reject(err)
            resolve(res)
          })
      })
    },

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

  it('should accept valid incoming message', async function() {
    let message = {
      box: createBox("hi", BOB.keyPair.privateKey, ALICE.keyPair.publicKey),
      from: BOB.keyPair.publicKey,
      to: ALICE.keyPair.publicKey,
    }
    let { body } = await client(this.app).post('/message', message)
    assert.isTrue(body.ok)
  })

  it('should reject message that is not for me', async function() {
    let message = {
      box: createBox("hi", BOB.keyPair.privateKey, EVE.keyPair.publicKey),
      from: BOB.keyPair.publicKey,
      to: EVE.keyPair.publicKey,
    }
    let { body } = await client(this.app).post('/message', message)
    assert.equal(body.error, 'Message is not for me')
  })

  it('should reject message that does not decrypt', async function() {
    let message = {
      box: createBox("hi", BOB.keyPair.privateKey, EVE.keyPair.publicKey),
      from: BOB.keyPair.publicKey,
      to: ALICE.keyPair.publicKey,
    }
    let { body } = await client(this.app).post('/message', message)
    assert.equal(body.error, 'Could not decrypt message')
  })

})
