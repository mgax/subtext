import webpack from 'webpack'
import fs from 'fs'

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

(async function() {
  let stats = await webpackBuild({
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
  })
  console.log(stats.toString({colors: true}))
  buildIndex({webappHash: stats.toJson().chunks[0].hash})
})().catch((e) => { console.error(e) })
