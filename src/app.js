import { React } from './vendor.js'
import { random_keypair } from './messages.js'

const App = ({ contacts }) => (
  <div>
    {contacts.map((contact) =>
      <Conversation key={contact.publicKey.key} {... contact} />
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
          this.props.send({text: text})
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
    })
  }
  let state = JSON.parse(localStorage.subtext)
  state.contacts = [{publicKey: state.keypair.public}]
  window.app = ReactDOM.render((
    <App { ... state } />
  ), document.querySelector('#app'))
}
