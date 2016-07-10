import ChatHeader from './ChatHeader.js'
import PeerList from './PeerList.js'
import Conversation from './Conversation.js'

export default function Chat({
    modal, config, peers, selectedPeerId,
    updatePeerCard, selectPeer, addPeer, deletePeer, sendMessage,
  }) {

  let selectedPeer = peers[selectedPeerId]

  return (
    <div className='container-fluid'>
      <div className='row'>
        <div className='col-sm-4 app-peers'>
          <ChatHeader
            modal={modal}
            addPeer={addPeer}
            />
          <PeerList
            modal={modal}
            peers={peers}
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
