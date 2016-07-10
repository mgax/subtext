import classNames from 'classnames'
const { Provider, connect } = ReactRedux
import { h } from '../utils.js'
import Icon from './Icon.js'
import PeerModal from './PeerModal.js'

export default function Peer({
    store, peer, updatePeerCard, selectPeer, modal, deletePeer, selected
  }) {

  let name = peer.card.name || peer.url

  function onInfo() {

    let mapModalState = (state) => ({
      peer: state.peers[peer.id]
    })

    const ConnectedPeerModal = connect(mapModalState)(PeerModal)
    modal(
      <Provider store={store}>
        <ConnectedPeerModal
          updatePeerCard={updatePeerCard}
          deletePeer={deletePeer}
          />
      </Provider>
    )
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
