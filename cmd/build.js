import waiter from '../src/waiter.js'
import {buildJs, buildIndex} from '../src/build.js'

waiter((async function() {

  let stats = await buildJs()
  let hash = stats.toJson().chunks[0].hash
  console.log(stats.toString({colors: true}))
  let indexHtml = buildIndex(hash)

})())
