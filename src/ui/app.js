import 'babel-polyfill'
import classNames from 'classnames'
const { Provider, connect } = ReactRedux
import './style.scss'
import { waiter } from './utils.js'
import { createStore } from './store.js'
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
    $('.modal', container).modal().on('hidden.bs.modal', () => {
      ReactDOM.unmountComponentAtNode(container)
    })
  }

  function mapDispatchToProps(dispatch) {
    let serverProps = server.mapDispatchToProps(dispatch)
    return serverProps
  }

  window.S = {
    app: app,
    store: store,
    server: server,
    waiter: waiter,
  }

})()) }
