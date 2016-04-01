require('babel-polyfill')
import { React, ReactRedux, sodium } from './vendor.js'
import { randomKeyPair, createBox, boxId } from './messages.js'
import {
  createStore,
  newPeer,
} from './store.js'
const { Provider, connect } = ReactRedux

function h(callback) {
  return function(e) {
    e.preventDefault()
    callback()
  }
}

function App({peers, addPeer}) { return (

  <div>
    <button
      onClick={h(() => {
        let url = prompt('peer url')
        addPeer(url)
      })}
      >add peer</button>
    <ul>
      {peers.map((peer) => (
        <li key={peer.id}>{peer.url}</li>
      ))}
    </ul>
  </div>

) }

window.main = function() { (async function() {

  window.store = createStore()
  const socket = io.connect('/')

  async function send(type, ... args) {
    let [err, res] = await new Promise((resolve) => {
      socket.emit(type, args, resolve)
    })
    if(err) throw err
    return res
  }

  const ConnectedApp = connect((state) => state, mapDispatchToProps)(App)
  window.app = ReactDOM.render((
    <Provider store={window.store}>
      <ConnectedApp />
    </Provider>
  ), document.querySelector('#app'))

  function mapDispatchToProps(dispatch) { return {

    addPeer: async function(url) {
      let peer = await send('addPeer', url)
      dispatch(newPeer(peer))
    },

  }}

  let peers = await send('getPeers')
  for(let peer of peers) {
    store.dispatch(newPeer(peer))
  }

})().catch((e) => { console.error(e.stack) }) }
