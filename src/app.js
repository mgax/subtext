import 'babel-polyfill'
import classNames from 'classnames'
import './style.scss'
import { React, ReactRedux, sodium } from './vendor.js'
import { randomKeyPair, createBox, boxId } from './messages.js'
import {
  createStore,
  newPeer,
  newMessage,
  selectPeer,
} from './store.js'
const { Provider, connect } = ReactRedux

function h(callback, ... args) {
  return function(e) {
    e.preventDefault()
    callback(e, ... args)
  }
}

function sorted(list, keyFunc=((i) => i)) {
  return list.slice().sort((a, b) => {
    let ka = keyFunc(a)
    let kb = keyFunc(b)
    if(ka < kb) return -1
    if(ka > kb) return 1
    return 0
  })
}

function Icon({name}) {
  return <i className={`fa fa-${name}`} />
}

function Modal({title, children, buttons = []}) {
  return (
    <div className='modal fade'>
      <div className='modal-dialog' role='document'>
        <div className='modal-content'>
          <div className='modal-header'>
            <button type='button' className='close'
              data-dismiss='modal' aria-label='Close'>
              <span aria-hidden='true'>&times;</span>
            </button>
            <h4 className='modal-title'>{title}</h4>
          </div>
          <div className='modal-body'>
            {children}
          </div>
          <div className='modal-footer'>
            {buttons}
          </div>
        </div>
      </div>
    </div>
  )
}

class Compose extends React.Component {

  render() {
    let {className} = this.props

    return (
      <form onSubmit={h((e) => { this.handleSubmit(e) })}
          className={classNames(className, 'compose')}>
        <div className='compose-text'>
          <input name='text' placeholder='message ...' autoComplete='off' />
        </div>
        <button type='submit'
            className='compose-submit btn btn-default btn-sm'
            >send</button>
      </form>
    )
  }

  focusInput() {
    ReactDOM.findDOMNode(this).querySelector('[name=text]').focus()
  }

  componentDidMount() {
    this.focusInput()
  }

  handleSubmit(e) {
    let {peer, sendMessage} = this.props
    let input = e.target.querySelector('[name=text]')
    waiter(sendMessage(peer.id, {
      type: 'Message',
      text: input.value,
    }), false)
    input.value = ''
  }

}

function Message({message: {me, time, message: {text}}}) {
  let cls = classNames('message', {'message-me': me})
  return (
    <li className={cls}>
      <div className='time'>{moment(time).calendar()}</div>
      {text}
    </li>
  )
}

class MessageList extends React.Component {

  render() {
    let {className, peer} = this.props
    let messages = sorted(Object.values(peer.messages), (m) => m.time)
    return (
      <ul className={classNames(className, 'messageList')}
          onScroll={h(() => { this.onScroll() })}>
        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}
      </ul>
    )
  }

  componentDidMount() {
    this.bottom = true
    this.updateScroll = () => {
      if(this.bottom) {
        let node = ReactDOM.findDOMNode(this)
        node.scrollTop = node.scrollHeight - node.offsetHeight
      }
    }
    window.addEventListener('resize', this.updateScroll)
  }

  onScroll() {
    let node = ReactDOM.findDOMNode(this)
    this.bottom = node.scrollTop >= node.scrollHeight - node.offsetHeight
  }

  componentDidUpdate() {
    this.updateScroll()
  }


  componentWillUnmount() {
    window.removeEventListener('resize', this.updateScroll)
  }
}

function Conversation({peer, sendMessage}) {
  let willFocus, tUp, composeForm

  return (
    <div className='conversation'
        onMouseDown={() => { willFocus = ! (tUp && moment().diff(tUp) < 300) }}
        onMouseMove={() => { willFocus = false }}
        onMouseUp={() => { if(willFocus) {
          tUp = moment()
          composeForm.focusInput()
        } }}
        >
      <MessageList className='conversation-messages' peer={peer} />
      <Compose
        className='conversation-compose'
        ref={(c) => { composeForm = c }}
        peer={peer}
        sendMessage={sendMessage}
        />
    </div>
  )
}

function Peer({store, peer, updatePeerCard, selectPeer, modal, deletePeer, selected}) {
  let name = peer.card.name || peer.url

  function onInfo() {

    let mapModalState = (state) => ({
      peer: state.peers[peer.id]
    })

    function PeerModal({peer}) {
      let buttons = [
        <button key='1' type='button' className='btn btn-danger'
            onClick={h(() => {
              if(confirm(`delete ${peer.url}?`)) deletePeer(peer.id)
            })}>
          delete
        </button>
      ]
      return (
        <Modal title={name} buttons={buttons}>
          <h5>props</h5>
          <pre>{JSON.stringify(peer.props, null, 2)}</pre>
          <h5>
            card
            <a className='btn btn-secondary btn-sm pull-right' onClick={h(() => {
                  updatePeerCard(peer.id)
                })}>
              update
            </a>
          </h5>
          <p><code>{peer.url}</code></p>
          <pre>{JSON.stringify(peer.card, null, 2)}</pre>
        </Modal>
      )
    }

    const ConnectedPeerModal = connect(mapModalState)(PeerModal)
    modal(
      <Provider store={store}>
        <ConnectedPeerModal />
      </Provider>
    )
  }

  return (
    <div onClick={h(() => { selectPeer(peer.id) })}
        className={classNames('peer', {'peer-selected': selected})}>
      <button type='button' className='peer-menu' onClick={h(onInfo)}>
        <Icon name='cog' />
      </button>
      {name}
    </div>
  )
}

function App({store, peers, modal, selectedPeerId, updatePeerCard, selectPeer, addPeer, deletePeer, sendMessage}) {
  let selectedPeer = peers[selectedPeerId]

  return (
    <div className='container-fluid'>
      <div className='row'>
        <div className='col-sm-4 app-peers'>
          <button
            onClick={h(() => {
              let url = prompt('peer url')
              if(url) addPeer(url)
            })}
            >add peer</button>
          <ul>
            {Object.values(peers).map((peer) => (
              <li key={peer.id}>
                <Peer
                  store={store}
                  peer={peer}
                  updatePeerCard={updatePeerCard}
                  selectPeer={selectPeer}
                  deletePeer={deletePeer}
                  modal={modal}
                  selected={selectedPeerId == peer.id}
                  />
              </li>
            ))}
          </ul>
        </div>
        {selectedPeer && (
          <div className='col-sm-8 app-conversation'>
            <Conversation key={selectedPeer.id}
              peer={selectedPeer} sendMessage={sendMessage} />
          </div>
        )}
      </div>
    </div>
  )
}

function waiter(promise, printRv=true) {
  promise
    .then((rv) => { if(printRv || rv !== undefined) console.log(rv) })
    .catch((e) => { console.error(e.stack || e) })
}

window.main = function() { waiter((async function() {

  let store = createStore()
  const socket = io.connect('/')

  socket.on('unauthorized', (err) => {
    console.error('socket.io unauthorized:', err)
  })

  socket.on('connect', () => {
    socket.emit('authentication', localStorage.subtext_authToken)
  })

  socket.on('authenticated', () => {
    waiter(loadState(), false)
  })

  async function send(type, ... args) {
    let [err, res] = await new Promise((resolve) => {
      socket.emit(type, args, resolve)
    })
    if(err) throw new Error(err)
    return res
  }

  const ConnectedApp = connect((state) => state, mapDispatchToProps)(App)
  let app = ReactDOM.render((
    <Provider store={store}>
      <ConnectedApp store={store} modal={modal} />
    </Provider>
  ), document.querySelector('#app'))

  function modal(content) {
    let container = document.querySelector('#modal')
    ReactDOM.render(content, container)
    $('.modal', container).modal()
  }

  function mapDispatchToProps(dispatch) { return {

    addPeer: async function(url) {
      let peer = await send('addPeer', url)
      dispatch(newPeer(peer))
    },

    deletePeer: async function(peerId) {
      await send('deletePeer', peerId)
      window.location.reload()
    },

    sendMessage: async function(peerId, message) {
      await send('sendMessage', peerId, message)
    },

    updatePeerCard: async function(peerId) {
      let peer = await send('updatePeerCard', peerId)
      dispatch(newPeer(peer))
    },

    selectPeer: function(peerId) {
      dispatch(selectPeer(peerId))
    },

  }}

  window.S = {
    app: app,
    store: store,
    send: send,
    waiter: waiter,
  }

  async function loadState() {
    socket.on('message', (peerId, message) => {
      store.dispatch(newMessage(peerId, message))
    })
    let peers = await send('getPeers')
    for(let peer of peers) {
      store.dispatch(newPeer(peer))
      let messages = await send('getMessages', peer.id)
      for(let message of messages) {
        store.dispatch(newMessage(peer.id, message))
      }
    }
  }

})(), false) }
