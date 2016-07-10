import waiter from '../waiter.js'

const DEFAULT_INTERVAL = 60 * 1000 // one minute

export default function cron(server, interval=DEFAULT_INTERVAL) {
  let running = false

  let run = async () => {
    if(running) {
      console.warn("cron run already in progress; skipping this run")
      return
    }
    running = true
    console.info(`cron at ${new Date().toJSON()}`)
    await server.cron()
    running = false
  }

  setInterval(() => {
    waiter(run())
  }, interval)

  waiter(run())
}
