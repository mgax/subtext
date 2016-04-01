require('babel-polyfill')
import { React, ReactRedux, sodium } from './vendor.js'
import { randomKeyPair, createBox, boxId } from './messages.js'
import {
  createStore,
} from './store.js'
const { Provider, connect } = ReactRedux

const App = ({}) => (
  <div>
  </div>
)

window.main = function() { (async function() {

  window.store = createStore()
  const socket = io.connect('/')

  const ConnectedApp = connect((state) => state, mapDispatchToProps)(App)
  window.app = ReactDOM.render((
    <Provider store={window.store}>
      <ConnectedApp />
    </Provider>
  ), document.querySelector('#app'))

  function mapDispatchToProps(dispatch) { return {
  }}

})().catch((e) => { console.error(e.stack) }) }
