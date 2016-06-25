import { assert } from 'chai'
import { randomKeyPair, createBox, openBox } from '../src/server/messages.js'

describe('identity', function() {

  it('exchanges messages', function() {
    let alice = randomKeyPair()
    let bob = randomKeyPair()
    let cryptobox = createBox({hello: 'world'}, alice.privateKey, bob.publicKey)
    let payload = openBox(cryptobox, bob.privateKey, alice.publicKey)
    assert.deepEqual(payload, {hello: 'world'})
  })

  it('reads messages in standard format', function() {
    let alicePublicKey = {
      type: 'PublicKey',
      key: 'j/f5Is/1wuq/Md/NDX9F/4cmpHaiAgaoiILb9pWcuig=',
    }
    let bobPrivateKey = {
      type: 'PrivateKey',
      key: '4ROZBrZFj1yedGogzIvI0Q4ZTDnvdbh9WvaQkozTW7M=',
    }
    let cryptobox = {
      type: 'CryptoBox',
      ciphertext: 'aPxoDYldHBo4HlJQaAAj1G9mdiiEv9JyQ0KzRxQdza4V',
      nonce: '4thKliPbaeA3LM1r/YLiRo7xjZXgSs9j',
    }
    let payload = openBox(cryptobox, bobPrivateKey, alicePublicKey)
    assert.deepEqual(payload, {hello: 'world'})
  })

})
