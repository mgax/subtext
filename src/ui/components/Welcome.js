import StatefulButton from './StatefulButton.js'

export default class Welcome extends React.Component {

  render() {
    let { config } = this.props

    return (
      <div className='container-fluid'>

        <h1>Welcome to subtext!</h1>

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
                  await this.props.generateKeyPair()
                  return true
                }}
                >generate</StatefulButton>

            </form>
          </div>
        )}

        {(! config.name) && (
          <div>
            <h2>Public name</h2>

            <form className='form-inline'>

              <div className='form-group'>
                <label htmlFor='welcome-name'>Name</label>{' '}
                <input
                  type='text'
                  className='form-control'
                  id='welcome-name'
                  placeholder='Jane Doe'
                  ref='name'
                  />
              </div>{' '}

              <StatefulButton
                type='submit'
                className='btn btn-primary'
                onClick={async () => {
                  await this.props.setName(this.refs.name.value)
                  return true
                }}
                >Save</StatefulButton>

            </form>
          </div>
        )}

      </div>
    )
  }

}
