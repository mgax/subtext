import classNames from 'classnames'
import { h, sorted } from '../utils.js'
import Message from './Message.js'

export default class MessageList extends React.Component {

  render() {
    let {className, peer} = this.props

    let items = []
    let prev = null
    for (let m of sorted(Object.values(peer.messages), (m) => m.time)) {
      let current = {message: m}
      if(prev && prev.message.me == current.message.me) {
        prev.bleedDown = true
        current.bleedUp = true
      }
      items.push(current)
      prev = current
    }

    return (
      <ul className={classNames(className, 'messageList')}
          onScroll={h(() => { this.onScroll() })}>
        {items.map((item) => (
          <Message key={item.message.id} {... item} />
        ))}
      </ul>
    )
  }

  componentDidMount() {
    this.bottom = true
    this.updateScroll = () => {
      if(this.bottom) {
        let node = ReactDOM.findDOMNode(this)
        node.scrollTop = node.scrollHeight - node.offsetHeight
      }
    }
    this.updateScroll()
    window.addEventListener('resize', this.updateScroll)
  }

  onScroll() {
    let node = ReactDOM.findDOMNode(this)
    this.bottom = node.scrollTop >= node.scrollHeight - node.offsetHeight
  }

  componentDidUpdate() {
    this.updateScroll()
  }


  componentWillUnmount() {
    window.removeEventListener('resize', this.updateScroll)
  }
}
