import { sodium } from './vendor.js'

const to_publickey = (key) => ({type: 'PublicKey', key: sodium.to_base64(key)})
const to_privatekey = (key) => ({type: 'PrivateKey', key: sodium.to_base64(key)})
const to_cryptobox = (ciphertext, nonce) => ({
  type: 'CryptoBox',
  ciphertext: sodium.to_base64(ciphertext),
  nonce: sodium.to_base64(nonce),
})

function from_publickey({type, key}) {
  if(type != 'PublicKey') throw new Error("Not a PublicKey")
  return sodium.from_base64(key)
}

function from_privatekey({type, key}) {
  if(type != 'PrivateKey') throw new Error("Not a PrivateKey")
  return sodium.from_base64(key)
}

function from_cryptobox({type, ciphertext, nonce}) {
  if(type != 'CryptoBox') throw new Error("Not a CryptoBox")
  return [sodium.from_base64(ciphertext), sodium.from_base64(nonce)]
}

export function createBox(payload, senderPrivateKey, recipientPublicKey) {
  let sender = from_privatekey(senderPrivateKey)
  let recipient = from_publickey(recipientPublicKey)
  let nonce = random_nonce()
  let plaintext = sodium.from_string(JSON.stringify(payload))
  let ciphertext = sodium.crypto_box_easy(plaintext, nonce, recipient, sender)
  return to_cryptobox(ciphertext, nonce)
}

export function openBox(cryptoBox, recipientPrivateKey, senderPublicKey) {
  let recipient = from_privatekey(recipientPrivateKey)
  let sender = from_publickey(senderPublicKey)
  let [ciphertext, nonce] = from_cryptobox(cryptoBox)
  let plaintext = sodium.crypto_box_open_easy(ciphertext, nonce, sender, recipient)
  return JSON.parse(sodium.to_string(plaintext))
}

function random_nonce() {
  return sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES)
}

export function randomKeyPair() {
  let { publicKey, privateKey, keyType } = sodium.crypto_box_keypair()
  if(keyType != 'curve25519') throw new Error("Unexpected key type")
  return {
    type: 'KeyPair',
    publicKey: to_publickey(publicKey),
    privateKey: to_privatekey(privateKey),
  }
}

export function boxId(cryptoBox) {
  let [ciphertext] = from_cryptobox(cryptoBox)
  return sodium.to_base64(sodium.crypto_hash(ciphertext).slice(0, 32))
}
