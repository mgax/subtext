export default function waiter(promise) {
  promise
    .then((rv) => { if(rv !== undefined) console.log(rv) })
    .catch((e) => { console.error(e.stack || e) })
}
