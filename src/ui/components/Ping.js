import { PING_OK, PING_OFFLINE } from '../store.js'

function pingState(ping) {
  switch(ping) {
    case PING_OK:
      return 'ok'

    case PING_OFFLINE:
      return 'offline'
  }
}

export default function Ping({ping}) {
  let state = pingState(ping)
  return (
    <div className={`ping ping-${state}`}>
      {state}
    </div>
  )
}
