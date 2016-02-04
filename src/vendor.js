if(typeof window == 'undefined') {
  module.exports = {
    sodium: require('libsodium-wrappers'),
  }
}
else {
  module.exports = {
    sodium: window.sodium,
  }
}
