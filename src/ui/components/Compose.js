import { h, waiter } from '../utils.js'
import classNames from 'classnames'

export default class Compose extends React.Component {

  render() {
    let {className} = this.props

    return (
      <form onSubmit={h((e) => { this.handleSubmit(e) })}
          className={classNames(className, 'compose')}>
        <div className='compose-text'>
          <input name='text' placeholder='message ...' autoComplete='off' />
        </div>
        <button type='submit'
            className='compose-submit btn btn-default btn-sm'
            >send</button>
      </form>
    )
  }

  focusInput() {
    ReactDOM.findDOMNode(this).querySelector('[name=text]').focus()
  }

  componentDidMount() {
    this.focusInput()
  }

  handleSubmit(e) {
    let {peer, sendMessage} = this.props
    let input = e.target.querySelector('[name=text]')
    waiter(sendMessage(peer.id, {
      type: 'Message',
      text: input.value,
    }), false)
    input.value = ''
  }

}
