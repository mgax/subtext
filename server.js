import express from 'express'
import broker from './src/broker.js'

let app = express()
app.use(express.static('build'))
let server = app.listen(+(process.env.PORT || 8000))
broker(server)
