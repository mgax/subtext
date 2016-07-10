import { h } from '../utils.js'

export default function ChatHeader({addPeer}) {
  return (
    <button
      onClick={h(() => {
        let url = prompt('peer url')
        if(url) addPeer(url)
      })}
      >add peer</button>
  )
}
