import SocketIO from 'socket.io'
import socketioAuth from 'socketio-auth'
import { createBox, randomKeyPair } from './messages.js'

export default class PrivateApi {

  constructor(core) {
    this.core = core
  }

  websocketConnection(socket) {
    function on(type, callback) {
      socket.on(type, async function(args, respond) {
        try {
          let res = await callback(... args)
          respond([null, res])
        }
        catch(err) {
          console.error(err.stack || err)
          respond([''+err])
        }
      })
    }

    let subscribe = (type) => {
      function handler() {
        socket.emit(type, ... arguments)
      }

      this.core.events.on(type, handler)

      socket.on('disconnect', () => {
        this.core.events.removeListener(type, handler)
      })
    }

    on('getConfig', async () => {
      return {
        name: await this.core.prop('name'),
        hasKeyPair: !! this.core.keyPair,
      }
    })

    on('setName', async (name) => {
      await this.core.setName(name)
    })

    on('generateKeyPair', async () => {
      await this.core.setKeyPair(randomKeyPair())
    })

    on('addPeer', async (url) => {
      return await this.core.getPeerByUrl(url)
    })

    on('deletePeer', async (peerId) => {
      await this.core.deletePeerById(peerId)
    })

    on('updatePeerCard', async (peerId) => {
      await this.core.updatePeerCard(peerId)
      return await this.core.getPeer(peerId)
    })

    on('setPeerProps', async (peerId, props) => {
      await this.core.setPeerProps(peerId, props)
    })

    on('getPeers', async () => {
      let rows = await this.core.db('SELECT * FROM peer')
      let peers = rows.map(this.core.loadPeer)
      return peers
    })

    on('sendMessage', async (peerId, message) => {
      let peer = await this.core.getPeer(peerId)
      let envelope = {
        type: 'Envelope',
        box: createBox(message, this.core.keyPair.privateKey, peer.card.publicKey),
        cardUrl: this.core.myCardUrl,
        from: this.core.keyPair.publicKey,
        to: peer.card.publicKey,
      }
      await this.core.saveMessage(peer.id, message, true)
      await this.core.send(peer.card.inboxUrl, envelope)
    })

    on('getMessages', async (peerId) => {
      let peer = await this.core.getPeer(peerId)
      let rows = await this.core.db(`SELECT * FROM message WHERE peer_id = ?
        ORDER BY id DESC LIMIT 10`, peer.id)
      return rows.map(this.core.loadMessage)
    })

    on('getPeersWithUnread', async () => {
      return await this.core.getPeersWithUnread()
    })

    on('markAsRead', async (peerId) => {
      await this.core.markAsRead(peerId)
      this.core.events.emit('markAsRead', peerId)
    })

    subscribe('message')

    subscribe('markAsRead')

  }

  createWebsocket(server) {
    socketioAuth(SocketIO(server), {
      authenticate: (socket, token, cb) => {
        cb(null, token == this.core.authToken)
      },
      postAuthenticate: (sock) => {
        this.websocketConnection(sock)
      }
    })

    return server
  }

}
