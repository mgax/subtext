if(typeof window == 'undefined') {
  module.exports = {
    sodium: require('libsodium-wrappers'),
  }
}
else {
  module.exports = {
    sodium: window.sodium,
    React: window.React,
    ReactDOM: window.ReactDOM,
    Redux: window.Redux,
    ReactRedux: window.ReactRedux,
  }
}
