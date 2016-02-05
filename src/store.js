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

export const receiveMessageBox = (messageBox, myPrivateKey, senderPublicKey) => (
  saveMessage(senderPublicKey, {
    type: 'Envelope',
    id: boxId(messageBox),
    from: senderPublicKey,
    message: openBox(messageBox, myPrivateKey, senderPublicKey),
  })
)

const SAVE_MESSAGE = 'SAVE_MESSAGE'
export const saveMessage = (contact, envelope) => ({
  type: SAVE_MESSAGE,
  contact: contact,
  envelope: envelope,
})

function reduce(state, action) {
  switch(action.type) {

    case LOAD_INITIAL:
      return action.state

    case ADD_CONTACT:
      let isOpen = !! state.contacts.find((c) =>
        c.publicKey.key == action.publicKey.key)
      if(isOpen) return state
      let contact = {
        publicKey: action.publicKey,
        log: [],
      }
      return {
        ... state,
        contacts: [].concat(state.contacts, [contact]),
      }

    case SAVE_MESSAGE:
      return {
        ...state,
        contacts: state.contacts.map((contact) => {
          if(contact.publicKey.key != action.contact.key) {
            return contact
          }
          return {
            ... contact,
            log: [].concat(contact.log, [action.envelope]),
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
