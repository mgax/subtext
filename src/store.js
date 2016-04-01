import { Redux } from './vendor.js'

const INITIAL_STATE = {}

function reduce(state=INITIAL_STATE, action) {
  switch(action.type) {

    default:
      return state

  }
}

export function createStore() {
  return Redux.createStore(reduce)
}
