import { Redux } from './vendor.js'

function reduce(state, action) {
  switch(action.type) {

    default:
      return state

  }
}

export function createStore() {
  return Redux.createStore(reduce)
}
