import 'babel-polyfill'
import classNames from 'classnames'
const { Provider, connect } = ReactRedux
import './style.scss'
import { waiter } from './utils.js'
import {
  createStore,
  newPeer,
  selectPeer,
} from './store.js'
import Server from './Server.js'
import App from './components/App.js'

window.main = function() { waiter((async function() {

  let store = createStore()
  let server = new Server(store)

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
      let peer = await server.call('addPeer', url)
      dispatch(newPeer(peer))
    },

    deletePeer: async function(peerId) {
      await server.call('deletePeer', peerId)
      window.location.reload()
    },

    sendMessage: async function(peerId, message) {
      await server.call('sendMessage', peerId, message)
    },

    updatePeerCard: async function(peerId) {
      let peer = await server.call('updatePeerCard', peerId)
      dispatch(newPeer(peer))
    },

    selectPeer: async function(peerId) {
      localStorage.subtext_selectedPeerId = peerId
      dispatch(selectPeer(peerId))
      await server.call('markAsRead', peerId)
    },

  }}

  window.S = {
    app: app,
    store: store,
    server: server,
    waiter: waiter,
  }

})(), false) }
