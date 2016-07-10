import Peer from './Peer.js'

export default function PeerList({
    store, peers, modal, selectedPeerId, updatePeerCard, selectPeer,
    deletePeer,
  }) {

  return (
    <ul>
      {Object.values(peers).map((peer) => (
        <li key={peer.id}>
          <Peer
            store={store}
            peer={peer}
            updatePeerCard={updatePeerCard}
            selectPeer={selectPeer}
            deletePeer={deletePeer}
            modal={modal}
            selected={selectedPeerId == peer.id}
            />
        </li>
      ))}
    </ul>
  )
}
