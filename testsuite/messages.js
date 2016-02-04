import { assert } from 'chai'
import { random_keypair, create_box, open_box } from '../src/messages.js'

describe('identity', function() {

  it('should exchange messages', function() {
    let alice = random_keypair()
    let bob = random_keypair()
    let cryptobox = create_box({hello: 'world'}, alice.private, bob.public)
    let payload = open_box(cryptobox, bob.private, alice.public)
    assert.deepEqual(payload, {hello: 'world'})
  })

  it('should read messages in standard format', function() {

    let alicePublicKey = {
      type: 'publickey',
      key: 'j/f5Is/1wuq/Md/NDX9F/4cmpHaiAgaoiILb9pWcuig=',
    }
    let bobPrivateKey = {
      type: 'privatekey',
      key: '4ROZBrZFj1yedGogzIvI0Q4ZTDnvdbh9WvaQkozTW7M=',
    }
    let cryptobox = {
      type: 'cryptobox',
      ciphertext: 'aPxoDYldHBo4HlJQaAAj1G9mdiiEv9JyQ0KzRxQdza4V',
      nonce: '4thKliPbaeA3LM1r/YLiRo7xjZXgSs9j',
    }
    let payload = open_box(cryptobox, bobPrivateKey, alicePublicKey)
    assert.deepEqual(payload, {hello: 'world'})
  })

})
