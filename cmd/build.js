import waiter from '../src/waiter.js'
import {buildUi} from '../src/build.js'

waiter((async function() {

  for(let name of (process.argv[2] || 'ui').split(',')) {
    switch(name) {

      case 'ui': {
        let uiStats = await buildUi()
        console.log(uiStats.toString({colors: true}))
        continue
      }

      default: {
        console.error('unknown target', name)
        process.exit(1)
      }

    }
  }

})())
