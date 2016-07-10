import { h } from '../utils.js'
import Icon from './Icon.js'

export default function ChatHeader({addPeer}) {
  return (
    <div className='clearfix'>

      <button
        type='button'
        className='btn btn-success-outline'
        onClick={h(() => {
          console.log('configure')
        })}
        >
        <Icon name='cog' />
      </button>

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
