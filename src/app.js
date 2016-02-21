require('babel-polyfill')
import { React, ReactRedux, sodium } from './vendor.js'
import { randomKeyPair, createBox, boxId } from './messages.js'
import {
  create as createStore,
  loadInitial,
  addContact,
  receiveMessageBox,
  saveLogEntry,
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
    const { publicKey, log } = this.props
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault()
          let text = this.refs.text.value
          this.refs.text.value = ''
          this.props.send(publicKey, {
            type: 'Text',
            text: text,
          })
        }}
        ref='form'>
        <p>{publicKey.key}</p>
        <ul>
          {log.map(({ id, message }) =>
            <li key={id}>{message.text}</li>
          )}
        </ul>
        <input placeholder='message ...' ref='text' />
        <button type='submit'>send</button>
      </form>
    )
  }
}

window.main = function() { (async function() {

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

  let keyPair = JSON.parse(localStorage.keyPair)

  const socket = io.connect('/')
  socket.emit('Authenticate', keyPair.privateKey)

  socket.on('AuthenticationResult', ({ ok, error }) => {
    if(ok) console.log('server auth success')
    else console.error('server auth error:', error)
  })

  socket.on('MessageBox', ({ box, sender }) => {
    let myPrivateKey = store.getState().keyPair.privateKey
    window.store.dispatch(receiveMessageBox(box, myPrivateKey, sender))
  })

  const mapDispatchToProps = (dispatch) => ({
    send: (recipientPublicKey, message) => {
      let me = store.getState().keyPair
      let messageBox = createBox(message, me.privateKey, recipientPublicKey)
      dispatch(saveLogEntry(recipientPublicKey, {
        type: 'LogEntry',
        id: boxId(messageBox),
        from: me.publicKey,
        message: message,
      }))
      socket.emit('MessageBox', {
        type: 'MessageBox',
        box: messageBox,
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

})().catch((e) => { console.error(e.stack) }) }
