import { React, ReactRedux, sodium } from './vendor.js'
import { random_keypair, create_box } from './messages.js'
import { create as createStore, loadInitial, addContact } from './store.js'
const { Provider, connect } = ReactRedux

const App = ({ keypair, contacts, send }) => (
  <div>
    <p>public key: <tt>{keypair.public.key}</tt></p>
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
    const { publicKey } = this.props
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
        <input placeholder='message ...' ref='text' />
        <button type='submit'>send</button>
      </form>
    )
  }
}

window.main = function() {
  if(! localStorage.subtext) {
    localStorage.subtext = JSON.stringify({
      keypair: random_keypair(),
      contacts: [],
    })
  }
  window.store = createStore()
  window.store.dispatch(loadInitial(JSON.parse(localStorage.subtext)))
  store.subscribe(() => {
    localStorage.subtext = JSON.stringify(store.getState())
  })

  const mapDispatchToProps = (dispatch) => ({
    send: (recipientPublicKey, message) => {
      let me = store.getState().keypair
      console.log('message', {
        type: 'messagebox',
        box: create_box(message, me.private, recipientPublicKey),
        sender: me.public,
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
    window.store.dispatch(addContact({type: 'publickey', key: key}))
  }
}
