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
    callback(e)
  }
}

function Compose({peer, sendMessage}) {
  function onSubmit(e) {
    let input = e.target.querySelector('[name=text]')
    waiter(sendMessage(peer.url, {
      type: 'Message',
      text: input.value,
    }))
    input.value = ''
  }

  return (
    <form onSubmit={h(onSubmit)}>
      <input name='text' placeholder='message ...' />
      <button type='submit'>send</button>
    </form>
  )
}

function App({peers, addPeer, sendMessage}) { return (

  <div>
    <button
      onClick={h(() => {
        let url = prompt('peer url')
        addPeer(url)
      })}
      >add peer</button>
    <ul>
      {peers.map((peer) => (
        <li key={peer.id}>
          {peer.url}
          <Compose peer={peer} sendMessage={sendMessage} />
        </li>
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

    sendMessage: async function(peerUrl, message) {
      await send('sendMessage', peerUrl, message)
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
