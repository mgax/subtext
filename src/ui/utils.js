export waiter from '../waiter.js'

export function h(callback, ... args) {
  return function(e) {
    e.preventDefault()
    callback(e, ... args)
  }
}

export function sorted(list, keyFunc=((i) => i)) {
  return list.slice().sort((a, b) => {
    let ka = keyFunc(a)
    let kb = keyFunc(b)
    if(ka < kb) return -1
    if(ka > kb) return 1
    return 0
  })
}

export function waiter(promise) {
  promise
    .then((rv) => { if(rv !== undefined) console.log(rv) })
    .catch((e) => { console.error(e.stack || e) })
}

export function errorScreen(message, ... log) {
  console.warn(... log)
  return <p>{message}</p>
}
