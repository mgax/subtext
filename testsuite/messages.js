import { assert } from 'chai'
const sodium = require('libsodium-wrappers')

const to_publickey = (key) => ({type: 'publickey', key: sodium.to_base64(key)})
const to_privatekey = (key) => ({type: 'privatekey', key: sodium.to_base64(key)})
const to_cryptobox = (ciphertext, nonce) => ({
  type: 'cryptobox',
  ciphertext: sodium.to_base64(ciphertext),
  nonce: sodium.to_base64(nonce),
})

function from_publickey({type, key}) {
  if(type != 'publickey') throw new Error("Not a public key")
  return sodium.from_base64(key)
}

function from_privatekey({type, key}) {
  if(type != 'privatekey') throw new Error("Not a private key")
  return sodium.from_base64(key)
}

function from_cryptobox({type, ciphertext, nonce}) {
  if(type != 'cryptobox') throw new Error("Not a cryptobox")
  return [sodium.from_base64(ciphertext), sodium.from_base64(nonce)]
}

function create_box(payload, senderPrivateKey, recipientPublicKey) {
  let sender = from_privatekey(senderPrivateKey)
  let recipient = from_publickey(recipientPublicKey)
  let nonce = random_nonce()
  let plaintext = sodium.from_string(JSON.stringify(payload))
  let ciphertext = sodium.crypto_box_easy(plaintext, nonce, recipient, sender)
  return to_cryptobox(ciphertext, nonce)
}

function open_box(cryptobox, recipientPrivateKey, senderPublicKey) {
  let recipient = from_privatekey(recipientPrivateKey)
  let sender = from_publickey(senderPublicKey)
  let [ciphertext, nonce] = from_cryptobox(cryptobox)
  let plaintext = sodium.crypto_box_open_easy(ciphertext, nonce, sender, recipient)
  return JSON.parse(sodium.to_string(plaintext))
}

function random_nonce() {
  return sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
}

function random_keypair() {
  let { publicKey, privateKey, keyType } = sodium.crypto_box_keypair()
  if(keyType != 'curve25519') throw new Error("Unexpected key type")
  return {
    type: 'keypair',
    cipher: keyType,
    public: to_publickey(publicKey),
    private: to_privatekey(privateKey),
  }
}

describe('identity', function() {

  it('should exchange messages', function() {
    let alice = random_keypair()
    let bob = random_keypair()
    let cryptobox = create_box({hello: 'world'}, alice.private, bob.public)
    let payload = open_box(cryptobox, bob.private, alice.public)
    assert.deepEqual(payload, {hello: 'world'})
  })

})
