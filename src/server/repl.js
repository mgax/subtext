import nodeRepl from 'repl'
import waiter from '../waiter.js'
import identityServer from './identityserver.js'

export default async function repl(varPath) {
  let server = await identityServer(varPath)
  let shell = nodeRepl.start("subtext.# ")
  shell.context.waiter = waiter
  shell.context.server = server
}
