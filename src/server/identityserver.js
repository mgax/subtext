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

export default async function(
    varPath, publicUrl, authToken,
    fetchCard=defaultFetchCard, send=defaultSend
  ) {

  let rv = new Core(varPath, publicUrl, authToken, fetchCard, send)
  await rv.initialize()
  return rv

}
