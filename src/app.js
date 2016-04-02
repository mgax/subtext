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

function waiter(promise, printRv=true) {
  promise
    .then((rv) => { if(printRv || rv !== undefined) console.log(rv) })
    .catch((e) => { console.error(e.stack || e) })
}

window.main = function() { waiter((async function() {

  let store = createStore()
  const socket = io.connect('/')

  async function send(type, ... args) {
    let [err, res] = await new Promise((resolve) => {
      socket.emit(type, args, resolve)
    })
    if(err) throw new Error(err)
    return res
  }

  const ConnectedApp = connect((state) => state, mapDispatchToProps)(App)
  let app = ReactDOM.render((
    <Provider store={store}>
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

  window.S = {
    app: app,
    store: store,
    send: send,
    waiter: waiter,
  }

})(), false) }
