import 'babel-polyfill'
import classNames from 'classnames'
const { Provider, connect } = ReactRedux
import './style.scss'
import { waiter, any } from './utils.js'
import { createStore } from './store.js'
import Server from './Server.js'
import App from './components/App.js'

window.main = function() { waiter((async function() {

  let store = createStore()
  let server = new Server(store)

  function mount(node, Component, props) {
    let mapState = (state) => state
    let mapDispatch = (dispatch) => server.mapDispatchToProps(dispatch)
    let ConnectedComponent = connect(mapState, mapDispatch)(Component)
    ReactDOM.render((
      <Provider store={store}>
        <ConnectedComponent {... props} />
      </Provider>
    ), node)
  }

  function modal(Component, props) {
    let node = document.querySelector('#modal')
    mount(node, Component, props)
    $('.modal', node).modal().on('hidden.bs.modal', () => {
      ReactDOM.unmountComponentAtNode(node)
    })
  }

  function updateTitle() {
    let state = store.getState()
    let peers = Object.values((state || {}).peers || [])
    let anyUnread = any(peers.map((p) => p.unread))
    let title = `SubText${anyUnread ? ' *' : ''}`
    document.querySelector('head title').textContent = title
  }

  mount(document.querySelector('#app'), App, {modal})

  store.subscribe(updateTitle)

  window.S = {
    app: app,
    store: store,
    server: server,
    waiter: waiter,
  }

})()) }
