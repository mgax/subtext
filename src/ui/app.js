import 'babel-polyfill'
import classNames from 'classnames'
const { Provider } = ReactRedux
import './style.scss'
import { waiter } from './utils.js'
import { createStore } from './store.js'
import Server from './Server.js'
import App from './components/App.js'

window.main = function() { waiter((async function() {

  let store = createStore()
  let server = new Server(store)

  const ConnectedApp = connect(App)
  let app = ReactDOM.render((
    <Provider store={store}>
      <ConnectedApp
        modal={modal}
        />
    </Provider>
  ), document.querySelector('#app'))

  function modal(Component, props={}) {
    let container = document.querySelector('#modal')
    let ConnectedComponent = connect(Component)
    ReactDOM.render((
      <Provider store={store}>
        <ConnectedComponent {... props} />
      </Provider>
    ), container)
    $('.modal', container).modal().on('hidden.bs.modal', () => {
      ReactDOM.unmountComponentAtNode(container)
    })
  }

  function connect(component) {
    return ReactRedux.connect((state) => state, mapDispatchToProps)(component)
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
