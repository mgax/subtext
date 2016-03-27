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
  name: "Alice",
  publicUrl: "http://alice.example.com",
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
  name: "Bob",
  publicUrl: "http://bob.example.com",
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
  name: "Eve",
  publicUrl: "http://eve.example.com",
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
          .expect(200)
          .expect('Content-Type', /^application\/json/)
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
          .expect(200)
          .expect('Content-Type', /^application\/json/)
          .end(function(err, res) {
            if(err) return reject(err)
            resolve(res)
          })
      })
    },

  }
}

function message(from, to, content) {
  return {
    box: createBox(content, from.keyPair.privateKey, to.keyPair.publicKey),
    from: from.publicUrl + '/profile',
    to: to.publicUrl + '/profile',
  }
}

describe('server', function() {

  before(function() {
    this.profiles = {
      [BOB.publicUrl + '/profile']: {publicKey: BOB.keyPair.publicKey},
    }
    let lookupProfile = (url) => this.profiles[url]
    this.tmp = temporaryIdentity()
    this.app = identityserver(this.tmp.path, lookupProfile).middleware
  })

  after(function() {
    this.tmp.cleanup()
  })

  it('should respond to profile', async function() {
    let { body } = await client(this.app).get('/profile')
    assert.equal(body.publicKey.key,
      'YRgaMPzdZPAQiWFiiCggx5qppkN5LNsFTvuoXFF5kDA=')
    assert.equal(body.inboxUrl, 'http://alice.example.com/message')
  })

  it('should accept valid incoming message', async function() {
    let msg = message(BOB, ALICE, "hi")
    let { body } = await client(this.app).post('/message', msg)
    assert.isTrue(body.ok)
  })

  it('should reject message that is not for me', async function() {
    let msg = message(BOB, EVE, "hi")
    let { body } = await client(this.app).post('/message', msg)
    assert.equal(body.error, 'Message is not for me')
  })

  it('should reject message that does not decrypt', async function() {
    let msg = message(BOB, EVE, "hi")
    msg.to = ALICE.publicUrl + '/profile'
    let { body } = await client(this.app).post('/message', msg)
    assert.equal(body.error, 'Could not decrypt message')
  })

})
