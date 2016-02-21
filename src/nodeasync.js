export default function(func, thisObj) {
  return function() {
    return new Promise((resolve, reject) => {
      function done(err, res) {
        if(err) return reject(err)
        resolve(res)
      }
      let args = [].concat(Array.prototype.slice.call(arguments), [done])
      func.apply(thisObj, args)
    })
  }
}
