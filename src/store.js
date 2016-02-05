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
  saveLogEntry(senderPublicKey, {
    type: 'LogEntry',
    id: boxId(messageBox),
    from: senderPublicKey,
    message: openBox(messageBox, myPrivateKey, senderPublicKey),
  })
)

const SAVE_LOG_ENTRY = 'SAVE_LOG_ENTRY'
export const saveLogEntry = (contact, logEntry) => ({
  type: SAVE_LOG_ENTRY,
  contact: contact,
  logEntry: logEntry,
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

    case SAVE_LOG_ENTRY:
      return {
        ...state,
        contacts: state.contacts.map((contact) => {
          if(contact.publicKey.key != action.contact.key) {
            return contact
          }
          return {
            ... contact,
            log: [].concat(contact.log, [action.logEntry]),
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
