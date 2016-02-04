import { random_keypair } from './messages.js'

window.main = function() {
  if(! localStorage.subtext) {
    localStorage.subtext = JSON.stringify({
      keypair: random_keypair(),
    })
  }
}
