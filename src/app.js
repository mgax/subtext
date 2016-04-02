require('babel-polyfill')
import { React, ReactRedux, sodium } from './vendor.js'
import { randomKeyPair, createBox, boxId } from './messages.js'
import {
  createStore,
  newPeer,
  newMessage,
} from './store.js'
const { Provider, connect } = ReactRedux

function h(callback, ... args) {
  return function(e) {
    e.preventDefault()
    callback(e, ... args)
  }
}

function sorted(list, keyFunc) {
  return list.slice().sort((a, b) => {
    let ka = keyFunc(a)
    let kb = keyFunc(b)
    if(ka < kb) return -1
    if(ka > kb) return 1
    return 0
  })
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

function Messages({peer}) {
  let messages = sorted(Object.values(peer.messages), (m) => m.time)
  return (
    <ul>
      {messages.map((message) => (
        <li key={message.id}>
          <p className='message-sender'>{message.from}</p>
          <p className='message-time'>{''+message.time}</p>
          <p className='message-text'>{message.message.text}</p>
        </li>
      ))}
    </ul>
  )
}

function App({peers, addPeer, deletePeer, sendMessage}) {
  function onDelete(e, peer) {
    if(! confirm(`delete ${peer.url}?`)) return
      deletePeer(peer.url)
  }

  return (
    <div>
      <button
        onClick={h(() => {
          let url = prompt('peer url')
          addPeer(url)
        })}
        >add peer</button>
      <ul>
        {Object.values(peers).map((peer) => (
          <li key={peer.id}>
            {peer.url}
            <button onClick={h(onDelete, peer)}>delete</button>
            <Compose peer={peer} sendMessage={sendMessage} />
            <Messages peer={peer} />
          </li>
        ))}
      </ul>
    </div>
  )
}

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

    deletePeer: async function(url) {
      await send('deletePeer', url)
      window.location.reload()
    },

    sendMessage: async function(peerUrl, message) {
      await send('sendMessage', peerUrl, message)
    },

  }}

  window.S = {
    app: app,
    store: store,
    send: send,
    waiter: waiter,
  }

  async function loadState() {
    let peers = await send('getPeers')
    for(let peer of peers) {
      store.dispatch(newPeer(peer))
      let messages = await send('getMessages', peer.url)
      for(let message of messages) {
        store.dispatch(newMessage(peer, message))
      }
    }
  }

  await loadState()

})(), false) }
