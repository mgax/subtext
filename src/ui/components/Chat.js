import { h } from '../utils.js'
import PeerList from './PeerList.js'
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
          <PeerList
            store={store}
            peers={peers}
            modal={modal}
            selectedPeerId={selectedPeerId}
            updatePeerCard={updatePeerCard}
            selectPeer={selectPeer}
            deletePeer={deletePeer}
            />
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
