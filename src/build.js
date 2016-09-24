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

export function index({vanilla=false}={}) {
  return fs.readFileSync(`${UI}/index.html`, 'utf8')
    .replace('{{ q }}', vanilla ? '?vanilla=y' : '')
}
