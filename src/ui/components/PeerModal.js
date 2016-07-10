import { h } from '../utils.js'
import Modal from './Modal.js'

export default function PeerModal({
    peer, updatePeerCard, deletePeer,
  }) {

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
