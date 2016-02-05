import { Redux } from './vendor.js'
import { openBox, boxId } from './messages.js'

const LOAD_INITIAL = 'LOAD_INITIAL'
export const loadInitial = (state) => ({
  type: LOAD_INITIAL,
  state: state,
})

const ADD_CONTACT = 'ADD_CONTACT'
export const addContact = (publicKey) => ({
  type: ADD_CONTACT,
  publicKey: publicKey,
})

const RECEIVE_MESSAGE_BOX = 'RECEIVE_MESSAGE_BOX'
export const receiveMessageBox = (messageBox, senderPublicKey) => ({
  type: RECEIVE_MESSAGE_BOX,
  messageBox: messageBox,
  senderPublicKey: senderPublicKey,
})

function reduce(state, action) {
  switch(action.type) {

    case LOAD_INITIAL:
      return action.state

    case ADD_CONTACT:
      let isOpen = !! state.contacts.find((c) =>
        c.publicKey.key == action.publicKey.key)
      if(isOpen) return state
      return {
        ... state,
        contacts: [].concat(state.contacts, [{
          publicKey: action.publicKey,
          messages: [],
        }]),
      }

    case RECEIVE_MESSAGE_BOX:
      let { messageBox, senderPublicKey } = action
      let myPrivateKey = state.keyPair.privateKey
      return {
        ...state,
        contacts: state.contacts.map((contact) => {
          if(contact.publicKey.key != senderPublicKey.key) {
            return contact
          }
          let message = {
            id: boxId(messageBox),
            message: openBox(messageBox, myPrivateKey, senderPublicKey),
          }
          return {
            ... contact,
            messages: [].concat(contact.messages, [message]),
          }
        })
      }

    default:
      return state

  }
}

export function create() {
  return Redux.createStore(reduce)
}
