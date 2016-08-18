import ChatHeader from './ChatHeader.js'
import PeerList from './PeerList.js'
import Conversation from './Conversation.js'
import Ping from './Ping.js'

export default function Chat({
    modal, config, ping,
    peers, selectedPeerId,
    updatePeerCard, selectPeer, addPeer, deletePeer, sendMessage, markAsRead,
  }) {

  let selectedPeer = peers[selectedPeerId]

  let onMouseMove = (e) => {
    if((selectedPeer || {}).unread) {
      markAsRead(selectedPeer.id)
    }
  }

  return (
    <div className='container-fluid' onMouseMove={onMouseMove}>
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
      <Ping ping={ping} />
    </div>
  )
}
