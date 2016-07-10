import webpackDevMiddleware from 'webpack-dev-middleware'
import webpack from 'webpack'
import fs from 'fs'
import createServer from './src/server/create.js'

const WEBAPP_OPTIONS = {
  entry: './src/ui/app.js',
  devtool: '#inline-source-map',
  output: {path: __dirname + '/build', filename: 'webapp.js'},
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', query: {presets: 'es2015,stage-0,react'}},
      {test: /\.scss$/, loader: 'style!css!sass'},
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
  let src = fs.readFileSync('./src/ui/index.html', 'utf8')
  return src.replace('{{ webappHash }}', webappHash||'')
}

async function build() {
  let stats = await webpackBuild(WEBAPP_OPTIONS)
  console.log(stats.toString({colors: true}))
  let indexHtml = index_html(stats.toJson().chunks[0].hash)
  fs.writeFileSync('./build/index.html', indexHtml, 'utf8')
}

async function devserver(path, publicUrl) {
  let { app } = await createServer(path, publicUrl)
  app.use(webpackDevMiddleware(webpack(WEBAPP_OPTIONS), {publicPath: '/'}))
  app.get('/', function(req, res) { res.send(index_html()) })
}

(async function() {
  let cmd = process.argv[2]

  switch(cmd) {

    case 'build':
      return await build()

    case 'devserver':
      return await devserver(process.argv[3], process.argv[4])

    default:
      throw new Error("Unknown command " + cmd)

  }
})().catch((e) => { console.error(e.stack) })
