import { Redux } from './vendor.js'

const NEW_PEER = 'NEW_PEER'
export function newPeer(peer) {
  return {type: NEW_PEER, peer}
}

const NEW_MESSAGE = 'NEW_MESSAGE'
export function newMessage(peerId, message) {
  return {type: NEW_MESSAGE, peerId, message}
}

const INITIAL_STATE = {
  peers: {},
}

function reduce(state=INITIAL_STATE, action) {
  switch(action.type) {

    case NEW_PEER:
      if(state.peers[action.peer.id]) return state
      return {
        ... state,
        peers: {
          ... state.peers,
          [action.peer.id]: {
            ... action.peer,
            messages: [],
          },
        },
      }

    case NEW_MESSAGE:
      let peer = state.peers[action.peerId]
      if(! peer) return state
      if(peer.messages[action.message.id]) return state
      return {
        ... state,
        peers: {
          ... state.peers,
          [peer.id]: {
            ... peer,
            messages: {
              ... peer.messages,
              [action.message.id]: {
                ... action.message,
                time: new Date(action.message.time),
              }
            },
          },
        },
      }

    default:
      return state

  }
}

export function createStore() {
  return Redux.createStore(reduce)
}
