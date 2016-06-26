import classNames from 'classnames'
const { Provider, connect } = ReactRedux
import { h } from '../utils.js'
import Modal from './Modal.js'
import Icon from './Icon.js'

export default function Peer({
    store, peer, updatePeerCard, selectPeer, modal, deletePeer, selected
  }) {

  let name = peer.card.name || peer.url

  function onInfo() {

    let mapModalState = (state) => ({
      peer: state.peers[peer.id]
    })

    function PeerModal({peer}) {
      let buttons = [
        <button key='1' type='button' className='btn btn-danger'
            onClick={h(() => {
              if(confirm(`delete ${peer.url}?`)) deletePeer(peer.id)
            })}>
          delete
        </button>
      ]
      return (
        <Modal title={name} buttons={buttons}>
          <h5>props</h5>
          <pre>{JSON.stringify(peer.props, null, 2)}</pre>
          <h5>
            card
            <a className='btn btn-secondary btn-sm pull-right' onClick={h(() => {
                  updatePeerCard(peer.id)
                })}>
              update
            </a>
          </h5>
          <p><code>{peer.url}</code></p>
          <pre>{JSON.stringify(peer.card, null, 2)}</pre>
        </Modal>
      )
    }

    const ConnectedPeerModal = connect(mapModalState)(PeerModal)
    modal(
      <Provider store={store}>
        <ConnectedPeerModal />
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
