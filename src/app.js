require('babel-polyfill')
import { React, ReactRedux, sodium } from './vendor.js'
import { randomKeyPair, createBox, boxId } from './messages.js'
import {
  createStore,
} from './store.js'
const { Provider, connect } = ReactRedux

const App = ({ keyPair, contacts, send }) => (
  <div>
    <p>public key: <tt>{keyPair.publicKey.key}</tt></p>
    {contacts.map((contact) =>
      <Conversation
        key={contact.publicKey.key}
        send={send}
        {... contact}
        />
    )}
  </div>
)

window.main = function() { (async function() {

  const socket = io.connect('/')

  const ConnectedApp = connect((state) => state, mapDispatchToProps)(App)
  window.app = ReactDOM.render((
    <Provider store={window.store}>
      <ConnectedApp />
    </Provider>
  ), document.querySelector('#app'))

})().catch((e) => { console.error(e.stack) }) }
