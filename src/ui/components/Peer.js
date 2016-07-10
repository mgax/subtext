import classNames from 'classnames'
const { Provider } = ReactRedux
import { h } from '../utils.js'
import Icon from './Icon.js'
import PeerModal from './PeerModal.js'

export default function Peer({
    modal, peer, selected,
    updatePeerCard, selectPeer, deletePeer,
  }) {

  let name = peer.card.name || peer.url

  function onInfo() {
    modal(PeerModal, {peer})
  }

  let className = classNames('peer', {
    'peer-selected': selected,
    'peer-unread': peer.unread,
  })

  return (
    <div onClick={h(() => { selectPeer(peer.id) })} className={className}>
      <button type='button' className='peer-menu' onClick={h(onInfo)}>
        <Icon name='cog' />
      </button>
      <span className='peer-name'>{name}</span>
    </div>
  )
}
