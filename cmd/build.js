import waiter from '../src/waiter.js'
import {buildJs} from '../src/build.js'

waiter((async function() {

  let stats = await buildJs()
  console.log(stats.toString({colors: true}))

})())
