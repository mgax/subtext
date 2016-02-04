import { Redux } from './vendor.js'

const LOAD_INITIAL = 'LOAD_INITIAL'
export const loadInitial = (state) => ({
  type: LOAD_INITIAL,
  state: state,
})

function reduce(state, action) {
  switch(action.type) {

    case LOAD_INITIAL:
      return action.state

    default:
      return state

  }
}

export function create() {
  return Redux.createStore(reduce)
}
