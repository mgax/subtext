import express from 'express'
import bodyParser from 'body-parser'

export default class PublicApi {

  constructor(core) {
    this.core = core

    this.app = express()
    this.app.use(bodyParser.json())

    let _wrap = (fn) => (...args) => fn(...args).catch(args[2])
    this.app.get('/card', _wrap(async (req, res) => {
      let name = await this.core.db.prop('name')
      res.send({
        publicKey: this.core.keyPair.publicKey,
        inboxUrl: this.core.publicUrl + '/message',
        name: name,
      })
    }))

    this.app.post('/message', _wrap(async (req, res) => {
      let result = await this.core.receive(req.body)
      res.send(result)
    }))
  }

}
