import { Redux } from './vendor.js'

const NEW_PEER = 'NEW_PEER'
export function newPeer(peer) {
  return {
    type: NEW_PEER,
    peer: peer,
  }
}

const INITIAL_STATE = {
  peers: [],
}

function reduce(state=INITIAL_STATE, action) {
  switch(action.type) {

    case NEW_PEER:
      if(state.peers.find((p) => p.id == action.peer.id)) {
        return state
      }
      return {
        ... state,
        peers: [].concat(state.peers, [action.peer]),
      }

    default:
      return state

  }
}

export function createStore() {
  return Redux.createStore(reduce)
}
