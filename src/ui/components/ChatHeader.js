import { h } from '../utils.js'

export default function ChatHeader({addPeer}) {
  return (
    <div className='clearfix'>
      <button
        className='pull-right btn btn-success-outline'
        onClick={h(() => {
          let url = prompt('peer url')
          if(url) addPeer(url)
        })}
        >add peer</button>
    </div>
  )
}
