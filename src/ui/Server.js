import { waiter } from './utils.js'
import {
  APP_STATE_LOADING,
  APP_STATE_WELCOME,
  APP_STATE_CHAT,
  setAppState,
  setConfig,
  newPeer,
  newMessage,
  selectPeer,
  markUnread,
} from './store.js'

export default class Server {

  constructor(store) {
    this.store = store
    this.socket = io.connect('/')

    this.on('unauthorized', (err) => {
      console.error('socket.io unauthorized:', err)
      localStorage.subtext_authToken = prompt("Please enter authToken")
      window.location.reload()
    })

    this.on('connect', () => {
      this.socket.emit('authentication', localStorage.subtext_authToken)
    })

    this.on('authenticated', () => {
      this.on('message', async (peerId, message) => {
        if(! this.store.getState().peers[peerId]) {
          let peer = await this.call('getPeer', peerId)
          this.store.dispatch(newPeer(peer))
        }
        this.store.dispatch(newMessage(peerId, message))
        this.store.dispatch(markUnread(peerId, true))
      })
      this.on('markAsRead', (peerId) => {
        this.store.dispatch(markUnread(peerId, false))
      })

      waiter(this.loadConfig())
    })
  }

  on(type, callback) {
    this.socket.on(type, (... args) => {
      console.debug('<==', type, ... args)
      callback(... args)
    })
  }

  async call(type, ... args) {
    console.debug('-->', type, ... args)
    let [err, rv] = await new Promise((resolve) => {
      this.socket.emit(type, args, (resp) => {
        resolve(resp)
      })
    })
    if(err) {
      console.debug('<-error-', err)
      throw err
    }
    else {
      console.debug('<--', rv)
      return rv
    }
  }

  async loadConfig() {
    let config = await this.call('getConfig')
    this.store.dispatch(setConfig(config))
    if(config.name && config.hasKeyPair) {
      this.store.dispatch(setAppState(APP_STATE_LOADING))
      return this.loadChat()
    }
    else {
      this.store.dispatch(setAppState(APP_STATE_WELCOME))
    }
  }

  async loadChat() {
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
      await this.call('markAsRead', selectedPeerId)
    }

    this.store.dispatch(setAppState(APP_STATE_CHAT))
  }

  mapDispatchToProps(dispatch) {

    return {

      generateKeyPair: async () => {
        await this.call('generateKeyPair')
        await this.loadConfig()
      },

      setName: async (name) => {
        await this.call('setName', name)
        await this.loadConfig()
      },

      setSmtp: async (smtp) => {
        await this.call('setSmtp', smtp)
        await this.loadConfig()
      },

      testSmtp: async () => {
        return await this.call('testSmtp')
      },

      addPeer: async (url) => {
        let peer = await this.call('addPeer', url)
        dispatch(newPeer(peer))
      },

      deletePeer: async (peerId) => {
        await this.call('deletePeer', peerId)
        window.location.reload()
      },

      sendMessage: async (peerId, message) => {
        await this.call('sendMessage', peerId, message)
      },

      updatePeerCard: async (peerId) => {
        let peer = await this.call('updatePeerCard', peerId)
        dispatch(newPeer(peer))
      },

      selectPeer: async (peerId) => {
        localStorage.subtext_selectedPeerId = peerId
        dispatch(selectPeer(peerId))
        await this.call('markAsRead', peerId)
      },

    }

  }

}
