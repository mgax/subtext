import waiter from '../src/waiter.js'
import {buildUi} from '../src/build.js'

waiter((async function() {

  let stats = await buildUi()
  console.log(stats.toString({colors: true}))

})())
