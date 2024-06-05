const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 9000
const server = app.listen(PORT, () => console.log(`port is connected to localhost:${PORT}`))
const io = require('socket.io')(server)

app.use(express.static(path.join(__dirname, 'public')))

let socketsConected = new Set()

io.on('connection', onConnected)

function onConnected(socket) {
  console.log('Socket connected', socket.id)
  socketsConected.add(socket.id)
  io.emit('users-total', socketsConected.size)

  socket.on('disconnect', () => {
    console.log('Socket disconnected', socket.id)
    socketsConected.delete(socket.id)
    io.emit('users-total', socketsConected.size)
  })

  socket.on('message', (data) => {
    socket.broadcast.emit('chat-message', data)
  })

  socket.on('file', (data) => {
    socket.broadcast.emit('chat-file', data)
  })

  socket.on('audio', (data) => {
    console.log('Audio received', data) // Debug log
    socket.broadcast.emit('chat-audio', data)
  })

  socket.on('feedback', (data) => {
    socket.broadcast.emit('feedback', data)
  })
}
