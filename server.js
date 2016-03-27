import express from 'express'

let app = express()
app.use(express.static('build'))
app.listen(+(process.env.PORT || 8000))
