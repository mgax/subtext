import {
  APP_STATE_LOADING,
  APP_STATE_WELCOME,
  APP_STATE_CHAT,
} from '../store.js'
import { errorScreen } from '../utils.js'
import Chat from './Chat.js'
import Welcome from './Welcome.js'

export default function App({appState, ... props}) {

  switch(appState) {

    case APP_STATE_LOADING:
      return <p>loading ...</p>

    case APP_STATE_WELCOME:
      return <Welcome {... props} />

    case APP_STATE_CHAT:
      return <Chat {... props} />

    default:
      return errorScreen("error :(", "Unknown app state", appState)

  }

}
