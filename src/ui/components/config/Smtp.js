import StatefulButton from '../StatefulButton.js'

export default class Smtp extends React.Component {

  render() {
    let { smtp={}, setSmtp } = this.props

    return (
      <div>
        <h2>Email server</h2>

        <form className='form-inline'>

          <div className='form-group'>
            <label htmlFor='Mail-host'>SMTP server</label>{' '}
            <input
              type='text'
              className='form-control'
              id='Mail-host'
              ref='host'
              placeholder='smtp.example.com'
              defaultValue={smtp.host}
              />
          </div>{' '}

          <div className='form-group'>
            <label htmlFor='Mail-port'>port</label>{' '}
            <input
              type='number'
              className='form-control'
              id='Mail-port'
              ref='port'
              defaultValue={smtp.port || 25}
              />
          </div>{' '}

          <div className='form-group'>
            <label htmlFor='Mail-from'>
              email address of SubText app
            </label>{' '}
            <input
              type='text'
              className='form-control'
              id='Mail-from'
              ref='from'
              placeholder='subtext@example.com'
              defaultValue={smtp.from}
              />
          </div>{' '}

          <div className='form-group'>
            <label htmlFor='Smtp-to'>your address</label>{' '}
            <input
              type='text'
              className='form-control'
              id='Smtp-to'
              ref='to'
              placeholder='me@example.com'
              defaultValue={smtp.to}
              />
          </div>{' '}

          <StatefulButton
            type='submit'
            className='btn btn-primary'
            onClick={async () => {
              await setSmtp({
                host: this.refs.host.value,
                port: this.refs.port.value,
                from: this.refs.from.value,
                to: this.refs.to.value,
              })
            }}
            >Save</StatefulButton>

        </form>
      </div>
    )
  }

}
