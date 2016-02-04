import SocketIO from 'socket.io'

function connection(socket) {
  socket.on('messagebox', (messagebox) => {
    console.log(messagebox)
  })
}

export default (server) => {
  SocketIO(server).on('connection', connection)
}
