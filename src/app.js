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

function Modal() {
  return (
    <div className='modal fade'>
      <div className='modal-dialog' role='document'>
        <div className='modal-content'>
          <div className='modal-header'>
            <button type='button' className='close'
              data-dismiss='modal' aria-label='Close'>
              <span aria-hidden='true'>&times;</span>
            </button>
            <h4 className='modal-title'>Modal title</h4>
          </div>
          <div className='modal-body'>
            <p>One fine body&hellip;</p>
          </div>
          <div className='modal-footer'>
            <button type='button' className='btn btn-secondary'
                data-dismiss='modal'>Close</button>
            <button type='button' className='btn btn-primary'>
              Save changes
            </button>
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

function Peer({peer, selectPeer, modal, deletePeer, selected}) {
  function onClick() {
    selectPeer(peer.id)
  }

  function onInfo() {
    modal(<Modal />)
  }

  function onDelete() {
    if(! confirm(`delete ${peer.url}?`)) return
      deletePeer(peer.id)
  }

  let menuId = `peer-menu-${peer.id}`
  let menu = (
    <div className='peer-menu dropdown'>
      <button type='button'
          className='peer-menubutton dropdown-toggle'
          id={menuId}
          data-toggle='dropdown'
          ><Icon name='cog' /></button>
      <div className='dropdown-menu dropdown-menu-right'
          aria-labelledby={menuId}>
        <a className='dropdown-item' onClick={h(onInfo)}>Info</a>
        <a className='dropdown-item' onClick={h(onDelete)}>Delete</a>
      </div>
    </div>
  )

  return (
    <div onClick={h(onClick)}
        className={classNames('peer', {'peer-selected': selected})}>
      {menu}
      {peer.url}
    </div>
  )
}

function App({peers, modal, selectedPeerId, selectPeer, addPeer, deletePeer, sendMessage}) {
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
                  peer={peer}
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
      <ConnectedApp modal={modal} />
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
