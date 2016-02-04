import webpack from 'webpack'

function webpackBuild(options) {
  return new Promise((resolve, reject) => {
    webpack(options, function(err, stats) {
      if(err) return reject(err)
      resolve(stats)
    })
  })
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
})()
