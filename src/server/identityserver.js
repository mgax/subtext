import request from 'request'
import nodeAsync from './nodeAsync.js'
import Core from './Core.js'

async function defaultFetchCard(url) {
  let res = await nodeAsync(request.get)(url, {json: true})
  if(res.statusCode == 200) return res.body
  throw new Error(`Request to ${url} failed with code ${res.statusCode}`)
}

async function defaultSend(url, envelope) {
  let res = await nodeAsync(request.post)(url, {json: true, body: envelope})
  if(res.statusCode == 200) return res.body
  throw new Error(`Request to ${url} failed with code ${res.statusCode}`)
}

function defaultNow() {
  return new Date().getTime()
}

export default async function(varPath, publicUrl, authToken, patches) {
  let {
    fetchCard=defaultFetchCard,
    send=defaultSend,
    now=defaultNow,
  } = patches

  let rv = new Core(varPath, publicUrl, authToken, fetchCard, send, now)
  await rv.initialize()
  return rv

}
