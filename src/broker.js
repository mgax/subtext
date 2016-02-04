import SocketIO from 'socket.io'
import { box_id } from './messages.js'

let clients = {}

function connection(socket) {
  socket.on('authenticate', (publicKey) => {
    clients[publicKey.key] = {send: send}
  })

  socket.on('messagebox', (messagebox) => {
    let key = messagebox.recipient.key
    let client = clients[key]
    if(client) client.send(messagebox)
  })

  function send(messagebox) {
    socket.emit('messagebox', messagebox)
  }
}

export default (server) => {
  SocketIO(server).on('connection', connection)
}
