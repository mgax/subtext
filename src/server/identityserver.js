import request from 'request'
import emailjs from 'emailjs'
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

function defaultSendMail(options) {
  console.info(`sending email: ${JSON.stringify(options)}`)
  let {host, port, from, to} = options.smtp
  let text = options.text
  let subject = "SubText notification"

  return new Promise((resolve, reject) => {
    let server = emailjs.server.connect({host, port})
    server.send({from, to, text, subject: subject}, function(err) {
      if(err) {
        console.warn("SMTP failed", err)
        reject(err)
      }
      else {
        resolve(true)
      }
    })
  })
}

export default async function(varPath, publicUrl, authToken, patches={}) {
  let {
    fetchCard=defaultFetchCard,
    send=defaultSend,
    sendMail=defaultSendMail,
    now=defaultNow,
  } = patches

  let rv = new Core(varPath, publicUrl, authToken, fetchCard, send,
    sendMail, now)
  await rv.initialize()
  return rv

}
