import { h } from '../utils.js'
import Peer from './Peer.js'
import Conversation from './Conversation.js'

export default function Chat({
    store, peers, modal, selectedPeerId, updatePeerCard, selectPeer, addPeer,
    deletePeer, sendMessage
  }) {

  let selectedPeer = peers[selectedPeerId]

  return (
    <div className='container-fluid'>
      <div className='row'>
        <div className='col-sm-4 app-peers'>
          <button
            onClick={h(() => {
              let url = prompt('peer url')
              if(url) addPeer(url)
            })}
            >add peer</button>
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
        </div>
        {selectedPeer && (
          <div className='col-sm-8 app-conversation'>
            <Conversation key={selectedPeer.id}
              peer={selectedPeer} sendMessage={sendMessage} />
          </div>
        )}
      </div>
    </div>
  )
}
