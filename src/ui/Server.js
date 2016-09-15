import EventEmitter from 'events'
import { waiter, timeMs } from './utils.js'
import {
  APP_STATE_LOADING,
  APP_STATE_WELCOME,
  APP_STATE_CHAT,
  PING_OK,
  PING_OFFLINE,
  setAppState,
  setPing,
  setConfig,
  newPeer,
  newMessage,
  selectPeer,
  markUnread,
} from './store.js'

const SECOND = 1000
const PING_LOOP_INTERVAL = SECOND
const PING_INTERVAL = 10 * SECOND
const PING_THRESHOLD = 2.5 * PING_INTERVAL

export default class Server {

  constructor({store}) {
    this.store = store
    this.socket = io.connect('/')
    this.events = new EventEmitter()

    this.onSocket('unauthorized', (err) => {
      console.error('socket.io unauthorized:', err)
      localStorage.subtext_authToken = prompt("Please enter authToken")
      window.location.reload()
    })

    this.onSocket('connect', () => {
      this.socket.emit('authentication', localStorage.subtext_authToken)
    })

    this.onSocket('message', async (peerId, message) => {
      if(! this.store.getState().peers[peerId]) {
        let peer = await this.call('getPeer', peerId)
        this.store.dispatch(newPeer(peer))
      }
      this.store.dispatch(newMessage(peerId, message))
      if(! message.me) {
        this.store.dispatch(markUnread(peerId, true))
      }
      this.events.emit('message', peerId, message)
    })
    this.onSocket('markAsRead', (peerId) => {
      this.store.dispatch(markUnread(peerId, false))
    })

    this.onSocket('authenticated', () => {
      waiter(this.loadConfig())
    })

    this.pingLoop()
  }

  onSocket(type, callback) {
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

  async setCustomUi(url) {
    await this.call('setCustomUi', url)
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
        let peer
        try { peer = await this.call('addPeer', url) }
        catch(e) {
          if(e.type == 'CardDownloadError') alert(e.message)
          throw e
        }
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

      markAsRead: async (peerId) => {
        dispatch(markUnread(peerId, false))
        await this.call('markAsRead', peerId)
      },

    }

  }

  pingLoop() {
    let lastPing = timeMs()
    let lastPingReply = timeMs()

    let sendPing = async () => {
      await this.call('test')
      lastPingReply = timeMs()
    }

    let loop = () => {
      let now = timeMs()

      let timeToPing = now - lastPing > PING_INTERVAL
      if(timeToPing) {
        lastPing = now
        waiter(sendPing())
      }

      let isLate = now - lastPingReply > PING_THRESHOLD
      this.store.dispatch(setPing(isLate ? PING_OFFLINE : PING_OK))
    }

    setInterval(loop, PING_LOOP_INTERVAL)
  }

}
