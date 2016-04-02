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

function Compose({className, peer, sendMessage}) {
  function onSubmit(e) {
    let input = e.target.querySelector('[name=text]')
    waiter(sendMessage(peer.id, {
      type: 'Message',
      text: input.value,
    }), false)
    input.value = ''
  }

  return (
    <form onSubmit={h(onSubmit)}
        className={classNames(className, 'compose')}>
      <div className='compose-text'>
        <input name='text' placeholder='message ...' />
      </div>
      <button type='submit'
          className='compose-submit btn btn-default btn-sm'
          >send</button>
    </form>
  )
}

function Messages({className, peer}) {
  let messages = sorted(Object.values(peer.messages), (m) => m.time)
  return (
    <ul className={classNames(className, 'messageList')}>
      {messages.map((message) => (
        <li key={message.id}>
          <p className='message-sender'>{message.from}</p>
          <p className='message-time'>{''+message.time}</p>
          <p className='message-text'>{message.message.text}</p>
        </li>
      ))}
    </ul>
  )
}

function Conversation({peer, sendMessage}) {
  return (
    <div className='conversation'>
      <Messages className='conversation-messages' peer={peer} />
      <Compose
        className='conversation-compose'
        peer={peer}
        sendMessage={sendMessage}
        />
    </div>
  )
}

function Peer({peer, selectPeer, deletePeer, selected}) {
  function onClick() {
    selectPeer(peer.id)
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

function App({peers, selectedPeerId, selectPeer, addPeer, deletePeer, sendMessage}) {
  let selectedPeer = peers[selectedPeerId]

  return (
    <div className='container-fluid'>
      <div className='row'>
        <div className='col-sm-4 app-peers'>
          <button
            onClick={h(() => {
              let url = prompt('peer url')
              addPeer(url)
            })}
            >add peer</button>
          <ul>
            {Object.values(peers).map((peer) => (
              <li key={peer.id}>
                <Peer
                  peer={peer}
                  selectPeer={selectPeer}
                  deletePeer={deletePeer}
                  selected={selectedPeerId == peer.id}
                  />
              </li>
            ))}
          </ul>
        </div>
        {selectedPeer && (
          <div className='col-sm-8 app-conversation'>
            <Conversation peer={selectedPeer} sendMessage={sendMessage} />
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
      <ConnectedApp />
    </Provider>
  ), document.querySelector('#app'))

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

  await loadState()

})(), false) }
