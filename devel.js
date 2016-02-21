import express from 'express'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpack from 'webpack'
import fs from 'fs'
import request from 'request'
import { randomKeyPair, createBox } from './src/messages.js'
import identityServer from './src/identityserver.js'
import nodeAsync from './src/nodeAsync.js'

const WEBAPP_OPTIONS = {
  entry: './src/app.js',
  devtool: '#inline-source-map',
  output: {path: __dirname + '/build', filename: 'webapp.js'},
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', query: {presets: 'es2015,stage-0,react'}},
    ],
    noParse: [
      /\/vendor\.js$/,
    ],
  },
}


function webpackBuild(options) {
  return new Promise((resolve, reject) => {
    webpack(options, function(err, stats) {
      if(err) return reject(err)
      resolve(stats)
    })
  })
}

function index_html(webappHash) {
  let src = fs.readFileSync('./src/index.html', 'utf8')
  return src.replace('{{ webappHash }}', webappHash||'')
}

async function build() {
  let stats = await webpackBuild(WEBAPP_OPTIONS)
  console.log(stats.toString({colors: true}))
  let indexHtml = index_html(stats.toJson().chunks[0].hash)
  fs.writeFileSync('./build/index.html', indexHtml, 'utf8')
}

async function devserver(path) {
  let app = express()
  app.use(identityServer(path))
  app.use(webpackDevMiddleware(webpack(WEBAPP_OPTIONS), {publicPath: '/'}))
  app.get('/', function(req, res) { res.send(index_html()) })
  let server = app.listen(8000)
}

function init(path) {
  fs.mkdirSync(path)
  fs.writeFileSync(path + '/config.json', JSON.stringify({
    keyPair: randomKeyPair(),
  }, null, 2), {mode: 0o600})
}

async function send(identityPath, finger, text) {

  async function get(url) {
    let res = await nodeAsync(request.get)(url, {json: true})
    return res.body
  }

  async function post(url, body) {
    let res = await nodeAsync(request.post)(url, {json: true, body: body})
    return res.body
  }

  let config = JSON.parse(fs.readFileSync(identityPath + '/config.json'))
  let peer = await get(finger)
  let message = {type: 'text', text: text}
  let result = await post(peer.messageUrl, {
    box: createBox(message, config.keyPair.privateKey, peer.publicKey),
    from: config.keyPair.publicKey,
    to: peer.publicKey,
  })
  console.assert(result.ok, 'error sending message: ' + JSON.stringify(result))

}

(async function() {
  let cmd = process.argv[2]

  switch(cmd) {

    case 'build':
      return await build()

    case 'devserver':
      return await devserver(process.argv[3])

    case 'init':
      return init(process.argv[3])

    case 'send':
      return send(process.argv[3], process.argv[4], process.argv[5])

    default:
      throw new Error("Unknown command " + cmd)

  }
})().catch((e) => { console.error(e.stack) })
