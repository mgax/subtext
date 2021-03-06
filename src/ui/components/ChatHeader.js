import { h } from '../utils.js'
import Icon from './Icon.js'
import ConfigModal from './ConfigModal.js'

export default function ChatHeader({modal, addPeer}) {
  return (
    <div className='clearfix ChatHeader'>

      <button
        type='button'
        className='pull-left btn btn-success-outline'
        onClick={h(() => {
          modal(ConfigModal)
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

      <h1>SubText</h1>

    </div>
  )
}
