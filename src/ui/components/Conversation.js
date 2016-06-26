import MessageList from './MessageList.js'
import Compose from './Compose.js'

export default function Conversation({peer, sendMessage}) {
  let willFocus, tUp, composeForm

  return (
    <div className='conversation'
        onMouseDown={() => { willFocus = ! (tUp && moment().diff(tUp) < 300) }}
        onMouseMove={() => { willFocus = false }}
        onMouseUp={() => { if(willFocus) {
          tUp = moment()
          composeForm.focusInput()
        } }}
        >
      <MessageList className='conversation-messages' peer={peer} />
      <Compose
        className='conversation-compose'
        ref={(c) => { composeForm = c }}
        peer={peer}
        sendMessage={sendMessage}
        />
    </div>
  )
}
