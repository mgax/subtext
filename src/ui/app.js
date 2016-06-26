import 'babel-polyfill'
import classNames from 'classnames'
const { Provider, connect } = ReactRedux
import './style.scss'
import { waiter } from './utils.js'
import {
  createStore,
  newPeer,
  newMessage,
  selectPeer,
  markUnread,
} from './store.js'
import App from './components/App.js'

window.main = function() { waiter((async function() {

  let store = createStore()
  const socket = io.connect('/')

  socket.on('unauthorized', (err) => {
    console.error('socket.io unauthorized:', err)
    localStorage.subtext_authToken = prompt("Please enter authToken")
    window.location.reload()
  })

  socket.on('connect', () => {
    socket.emit('authentication', localStorage.subtext_authToken)
  })

  socket.on('authenticated', () => {
    waiter(loadState(), false)
  })

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
      <ConnectedApp store={store} modal={modal} />
    </Provider>
  ), document.querySelector('#app'))

  function modal(content) {
    let container = document.querySelector('#modal')
    ReactDOM.render(content, container)
    $('.modal', container).modal()
  }

  function mapDispatchToProps(dispatch) { return {

    addPeer: async function(url) {
      let peer = await send('addPeer', url)
      dispatch(newPeer(peer))
    },

    deletePeer: async function(peerId) {
      await send('deletePeer', peerId)
      window.location.reload()
    },

    sendMessage: async function(peerId, message) {
      await send('sendMessage', peerId, message)
    },

    updatePeerCard: async function(peerId) {
      let peer = await send('updatePeerCard', peerId)
      dispatch(newPeer(peer))
    },

    selectPeer: async function(peerId) {
      localStorage.subtext_selectedPeerId = peerId
      dispatch(selectPeer(peerId))
      await send('markAsRead', peerId)
    },

  }}

  window.S = {
    app: app,
    store: store,
    send: send,
    waiter: waiter,
  }

  async function loadState() {
    socket.on('message', (peerId, message) => {
      store.dispatch(newMessage(peerId, message))
      store.dispatch(markUnread(peerId, true))
    })
    socket.on('markAsRead', (peerId) => {
      store.dispatch(markUnread(peerId, false))
    })
    let peers = await send('getPeers')
    for(let peer of peers) {
      store.dispatch(newPeer(peer))
      let messages = await send('getMessages', peer.id)
      for(let message of messages) {
        store.dispatch(newMessage(peer.id, message))
      }
    }
    let unreadPeers = await send('getPeersWithUnread')
    for(let peerId of unreadPeers) {
      store.dispatch(markUnread(peerId, true))
    }

    let selectedPeerId = +localStorage.subtext_selectedPeerId
    if(selectedPeerId) {
      store.dispatch(selectPeer(selectedPeerId))
      await send('markAsRead', peerId)
    }
  }

})(), false) }
