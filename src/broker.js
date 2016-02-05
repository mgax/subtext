import SocketIO from 'socket.io'
import { boxId } from './messages.js'

let clients = {}

function connection(socket) {
  socket.on('Authenticate', (publicKey) => {
    clients[publicKey.key] = {send: send}
  })

  socket.on('MessageBox', (messageBox) => {
    let key = messageBox.recipient.key
    let client = clients[key]
    if(client) client.send(messageBox)
  })

  function send(messageBox) {
    socket.emit('MessageBox', messageBox)
  }
}

export default (server) => {
  SocketIO(server).on('connection', connection)
}
