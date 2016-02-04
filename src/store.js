import { Redux } from './vendor.js'

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
export const receiveMessageBox = (messagebox) => ({
  type: RECEIVE_MESSAGE_BOX,
  messagebox: messagebox,
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
      return {
        ...state,
        contacts: state.contacts.map((contact) => {
          if(contact.publicKey.key != action.messagebox.sender.key) {
            return contact
          }
          return {
            ... contact,
            messages: [].concat(contact.messages, [action.messagebox]),
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
