import express from 'express'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpack from 'webpack'
import fs from 'fs'
import readlineLib from 'readline'
import request from 'request'
import { randomKeyPair, createBox, randomToken } from './src/messages.js'
import identityServer from './src/identityserver.js'
import nodeAsync from './src/nodeAsync.js'

const WEBAPP_OPTIONS = {
  entry: './src/app.js',
  devtool: '#inline-source-map',
  output: {path: __dirname + '/build', filename: 'webapp.js'},
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', query: {presets: 'es2015,stage-0,react'}},
      {test: /\.scss$/, loader: 'style!css!sass'},
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
  let config = fs.readFileSync(identityPath + '/config.json')
  let identity = await identityServer(path, config.authToken)
  app.use(identity.createApp())
  app.use(webpackDevMiddleware(webpack(WEBAPP_OPTIONS), {publicPath: '/'}))
  app.get('/', function(req, res) { res.send(index_html()) })
  let server = app.listen(+(process.env.PORT || 8000))
  identity.createWebsocket(server)
}

function prompt({question, defaultValue = '', valid = (() => true)}) {
  let rl = readlineLib.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  let defaultText = defaultValue ? ` [${defaultValue}]` : ''
  let text = `${question}${defaultText}: `
  return new Promise((resolve) => {
    function ask() {
      rl.question(text, (resp) => {
        let value = resp || defaultValue
        if(valid(resp)) {
          resolve(value)
          rl.close()
        }
        else {
          console.log('Not a valid answer:', value)
          ask()
        }
      })
    }
    ask()
  })
}

async function createidentity(path) {
  let name = await prompt({
    question: 'Name',
    defaultValue: process.env.USER,
  })
  let publicUrl = await prompt({
    question: 'URL where the subtext server will respond, no trailing\n' +
        'slash, e.g. "http://subtext.example.com"',
    valid: (url) => url.match(/^http[s]?:\/\/.+[^/]$/),
  })
  let authToken = randomToken(20)
  fs.mkdirSync(path)
  fs.writeFileSync(path + '/config.json', JSON.stringify({
    keyPair: randomKeyPair(),
    name: name,
    publicUrl: publicUrl,
    authToken: authToken,
  }, null, 2), {mode: 0o600})
  console.log('Your authentication token:', authToken)
}

(async function() {
  let cmd = process.argv[2]

  switch(cmd) {

    case 'build':
      return await build()

    case 'devserver':
      return await devserver(process.argv[3])

    case 'createidentity':
      return await createidentity(process.argv[3])

    default:
      throw new Error("Unknown command " + cmd)

  }
})().catch((e) => { console.error(e.stack) })
