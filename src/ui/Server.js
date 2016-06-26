import { waiter } from './utils.js'
import {
  newPeer,
  newMessage,
  selectPeer,
  markUnread,
} from './store.js'

export default class Server {

  constructor(store) {
    this.store = store
    this.socket = io.connect('/')

    this.socket.on('unauthorized', (err) => {
      console.error('socket.io unauthorized:', err)
      localStorage.subtext_authToken = prompt("Please enter authToken")
      window.location.reload()
    })

    this.socket.on('connect', () => {
      this.socket.emit('authentication', localStorage.subtext_authToken)
    })

    this.socket.on('authenticated', () => {
      waiter(this.loadState())
    })
  }

  async call(type, ... args) {
    let [err, res] = await new Promise((resolve) => {
      this.socket.emit(type, args, resolve)
    })
    if(err) throw new Error(err)
    return res
  }

  async loadState() {
    this.socket.on('message', (peerId, message) => {
      this.store.dispatch(newMessage(peerId, message))
      this.store.dispatch(markUnread(peerId, true))
    })
    this.socket.on('markAsRead', (peerId) => {
      this.store.dispatch(markUnread(peerId, false))
    })
    let peers = await this.call('getPeers')
    for(let peer of peers) {
      this.store.dispatch(newPeer(peer))
      let messages = await this.call('getMessages', peer.id)
      for(let message of messages) {
        this.store.dispatch(newMessage(peer.id, message))
      }
    }
    let unreadPeers = await this.call('getPeersWithUnread')
    for(let peerId of unreadPeers) {
      this.store.dispatch(markUnread(peerId, true))
    }

    let selectedPeerId = +localStorage.subtext_selectedPeerId
    if(selectedPeerId) {
      this.store.dispatch(selectPeer(selectedPeerId))
      await this.call('markAsRead', peerId)
    }
  }

}
