import 'babel-polyfill'
import './style.scss'
import { waiter } from './utils.js'
import Ui from './Ui.js'

window.main = function() { waiter((async function() {
  new Ui().mount()
  window.S.waiter = waiter
})()) }
