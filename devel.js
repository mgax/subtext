import webpack from 'webpack'
import fs from 'fs'

const WEBAPP_OPTIONS = {
  entry: './src/app.js',
  devtool: '#inline-source-map',
  output: {path: 'build', filename: 'webapp.js'},
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel', query: {presets: 'es2015,stage-0'}},
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

function buildIndex(options) {
  let src = fs.readFileSync('./src/index.html', 'utf8')
  let indexHtml = src.replace('{{ webappHash }}', options.webappHash)
  fs.writeFileSync('./build/index.html', indexHtml, 'utf8')
}

async function build() {
  let stats = await webpackBuild(WEBAPP_OPTIONS)
  console.log(stats.toString({colors: true}))
  buildIndex({webappHash: stats.toJson().chunks[0].hash})
}

(async function() {
  let cmd = process.argv[2]

  switch(cmd) {

    case 'build':
      return await build()

    default:
      throw new Error("Unknown command " + cmd)

  }
})().catch((e) => { console.error(e) })
