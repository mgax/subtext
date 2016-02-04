import express from 'express'
import webpackDevMiddleware from 'webpack-dev-middleware'
import webpack from 'webpack'
import fs from 'fs'
import broker from './src/broker.js'

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

async function devserver() {
  let app = express()
  app.use(webpackDevMiddleware(webpack(WEBAPP_OPTIONS), {publicPath: '/'}))
  app.get('/', function(req, res) { res.send(index_html()) })
  let server = app.listen(8000)
  broker(server)
}

(async function() {
  let cmd = process.argv[2]

  switch(cmd) {

    case 'build':
      return await build()

    case 'devserver':
      return await devserver()

    default:
      throw new Error("Unknown command " + cmd)

  }
})().catch((e) => { console.error(e) })
