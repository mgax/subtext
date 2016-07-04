import fs from 'fs'
import request from 'supertest'
import { createBox } from '../src/server/messages.js'

export const ALICE = {
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
  authToken: '--alice-token--',
  publicUrl: "http://alice.example.com",
}

export const BOB = {
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
  authToken: '--bob-token--',
  publicUrl: "http://bob.example.com",
}

export const EVE = {
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
  authToken: '--eve-token--',
  publicUrl: "http://eve.example.com",
}

export function client(app) {
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

export function message(from, to, content) {
  return {
    box: createBox(content, from.keyPair.privateKey, to.keyPair.publicKey),
    cardUrl: from.publicUrl + '/card',
    from: from.keyPair.publicKey,
    to: to.keyPair.publicKey,
  }
}
