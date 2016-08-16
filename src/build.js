import fs from 'fs'
import webpack from 'webpack'
import webpackDevMiddleware from 'webpack-dev-middleware'

const UI = `${__dirname}/ui`
const BUILD = `${__dirname}/../build`

const webpackOptions = {
  entry: `${UI}/main.js`,
  devtool: '#inline-source-map',
  output: {path: BUILD, filename: 'webapp.js'},
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', query: {presets: 'es2015,stage-0,react'}},
      {test: /\.scss$/, loader: 'style!css!sass'},
    ],
  },
}

export function devMiddleware() {
  return webpackDevMiddleware(webpack(webpackOptions), {publicPath: '/'})
}

export function buildJs() {
  return new Promise((resolve, reject) => {
    webpack(webpackOptions, function(err, stats) {
      if(err) return reject(err)
      resolve(stats)
    })
  })
}

export function index(hash) {
  let template = fs.readFileSync(`${UI}/index.html`, 'utf8')
  return template.replace('{{ hash }}', hash)
}
