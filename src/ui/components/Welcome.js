import Name from './config/Name.js'
import KeyPair from './config/KeyPair.js'

export default class Welcome extends React.Component {

  render() {
    let { config, setName, generateKeyPair } = this.props

    return (
      <div className='container-fluid'>

        <h1>Welcome to subtext!</h1>

        {(! config.name) && (
          <Name setName={setName} />
        )}

        {(! config.hasKeyPair) && (
          <KeyPair generateKeyPair={generateKeyPair} />
        )}

      </div>
    )
  }

}
