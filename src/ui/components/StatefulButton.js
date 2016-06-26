import { h } from '../utils.js'

export default class StatefulButton extends React.Component {

  constructor(props) {
    super(props)
    this.state = {busy: false}
  }

  render() {
    let { onClick, children, ... props } = this.props
    return (
      <button
        { ... props }
        disabled={this.state.busy}
        onClick={h(async () => {
          this.setState({busy: true})
          let done = await onClick()
          if(this.isMounted() && ! done) this.setState({busy: false})
        })}
        >
        {children}
        {this.state.busy && ' ...'}
      </button>
    )
  }

}
