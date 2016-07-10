import StatefulButton from './StatefulButton.js'
import Name from './config/Name.js'

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
          <div>
            <h2>Key pair</h2>

            <form className='form-inline'>

              <div className='form-group'>
                <p className='form-control-static'>
                  You don't have a key pair. Generate one?
                </p>
              </div>{' '}

              <StatefulButton
                className='btn btn-primary'
                onClick={async () => {
                  await generateKeyPair()
                  return true
                }}
                >generate</StatefulButton>

            </form>
          </div>
        )}

      </div>
    )
  }

}
