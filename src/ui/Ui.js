const { Provider, connect } = ReactRedux
import { any } from './utils.js'
import { createStore } from './store.js'
import Server from './Server.js'
import App from './components/App.js'

export default class Ui {

  constructor() {
    this.store = createStore()
    this.server = new Server(this.store)
  }

  mountComponent(node, Component, props) {
    let mapState = (state) => state
    let mapDispatch = (dispatch) => this.server.mapDispatchToProps(dispatch)
    let ConnectedComponent = connect(mapState, mapDispatch)(Component)
    ReactDOM.render((
      <Provider store={this.store}>
        <ConnectedComponent {... props} />
      </Provider>
    ), node)
  }

  modal(Component, props) {
    let node = document.querySelector('#modal')
    this.mountComponent(node, Component, props)
    $('.modal', node).modal().on('hidden.bs.modal', () => {
      ReactDOM.unmountComponentAtNode(node)
    })
  }

  updateTitle() {
    let state = this.store.getState()
    let peers = Object.values((state || {}).peers || [])
    let anyUnread = any(peers.map((p) => p.unread))
    let title = `SubText${anyUnread ? ' *' : ''}`
    document.querySelector('head title').textContent = title
  }

  mount() {
    this.mountComponent(document.querySelector('#app'), App, {
      modal: this.modal.bind(this),
    })

    this.store.subscribe(() => this.updateTitle())

    window.S = this
  }

}
