import { random_keypair } from './messages.js'

window.main = function() {
  console.log('hello from the app', random_keypair())
}
