import { React, ReactRedux, sodium } from './vendor.js'
import { randomKeyPair, createBox } from './messages.js'
import {
  create as createStore,
  loadInitial,
  addContact,
  receiveMessageBox,
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

class Conversation extends React.Component {
  render() {
    const { publicKey, messages } = this.props
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          let text = this.refs.text.value
          this.refs.text.value = ''
          this.props.send(publicKey, {
            type: 'message',
            text: text,
          })
        }}
        ref='form'>
        <p>{publicKey.key}</p>
        <ul>
          {messages.map(({ id, message }) =>
            <li key={id}>{message.text}</li>
          )}
        </ul>
        <input placeholder='message ...' ref='text' />
        <button type='submit'>send</button>
      </form>
    )
  }
}

window.main = function() {
  if(! localStorage.subtext) {
    localStorage.subtext = JSON.stringify({
      keyPair: randomKeyPair(),
      contacts: [],
    })
  }
  window.store = createStore()
  window.store.dispatch(loadInitial(JSON.parse(localStorage.subtext)))
  store.subscribe(() => {
    localStorage.subtext = JSON.stringify(store.getState())
  })

  const socket = io.connect('/')
  socket.emit('Authenticate', store.getState().keyPair.publicKey)

  socket.on('MessageBox', ({ box, sender }) => {
    window.store.dispatch(receiveMessageBox(box, sender))
  })

  const mapDispatchToProps = (dispatch) => ({
    send: (recipientPublicKey, message) => {
      let me = store.getState().keyPair
      socket.emit('MessageBox', {
        type: 'MessageBox',
        box: createBox(message, me.privateKey, recipientPublicKey),
        sender: me.publicKey,
        recipient: recipientPublicKey,
      })
    }
  })

  const ConnectedApp = connect((state) => state, mapDispatchToProps)(App)
  window.app = ReactDOM.render((
    <Provider store={window.store}>
      <ConnectedApp />
    </Provider>
  ), document.querySelector('#app'))

  window.talk = (key) => {
    if(sodium.from_base64(key).length != 32) throw new Error("invalid key")
    window.store.dispatch(addContact({type: 'PublicKey', key: key}))
  }
}
