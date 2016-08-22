import nodeRepl from 'repl'
import waiter from '../waiter.js'
import identityServer from './identityserver.js'

export default async function repl() {
  let varPath = process.env.SUBTEXT_VAR
  let server = await identityServer(varPath)
  let shell = nodeRepl.start("subtext.# ")
  shell.context.waiter = waiter
  shell.context.server = server
}
