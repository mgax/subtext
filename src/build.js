import fs from 'fs'
import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'

const UI = `${__dirname}/ui`
const BUILD = `${__dirname}/../build`

const WEBPACK_OPTIONS_UI = {
  entry: `${UI}/main.js`,
  devtool: '#inline-source-map',
  output: {path: BUILD, filename: 'ui.js'},
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', query: {presets: 'es2015,stage-0,react'}},
      {test: /\.scss$/, loader: 'style!css!sass'},
    ],
  },
}

const WEBPACK_OPTIONS_SERVER = {
  target: 'node',
  entry: ['babel-polyfill', './cmd/server.js'],
  output: {path: BUILD, filename: 'server.js'},
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', query: {presets: 'es2015,stage-0,react'}},
    ],
  },
  externals: (context, request, cb) => {
    // https://github.com/webpack/webpack/issues/839#issuecomment-76736465
    if(request.match(/^\./)) cb(); else cb(null, 'commonjs ' + request)
  },
}

export function devMiddleware() {
  return webpackDevMiddleware(webpack(WEBPACK_OPTIONS_UI), {publicPath: '/'})
}

function build(options) {
  return new Promise((resolve, reject) => {
    webpack(options, function(err, stats) {
      if(err) return reject(err)
      resolve(stats)
    })
  })
}

export function buildUi() {
  return build(WEBPACK_OPTIONS_UI)
}

export function buildServer() {
  return build(WEBPACK_OPTIONS_SERVER)
}

export function index({vanilla=false}={}) {
  return fs.readFileSync(`${UI}/index.html`, 'utf8')
    .replace('{{ q }}', vanilla ? '?vanilla=y' : '')
}
