import Peer from './Peer.js'

export default function PeerList({
    modal, peers,
    selectedPeerId, updatePeerCard, selectPeer, deletePeer,
  }) {

  return (
    <ul>
      {Object.values(peers).map((peer) => (
        <li key={peer.id}>
          <Peer
            modal={modal}
            peer={peer}
            updatePeerCard={updatePeerCard}
            selectPeer={selectPeer}
            deletePeer={deletePeer}
            selected={selectedPeerId == peer.id}
            />
        </li>
      ))}
    </ul>
  )
}
