import StatefulButton from '../StatefulButton.js'

export default class Smtp extends React.Component {

  render() {
    let { setSmtp } = this.props

    return (
      <div>
        <h2>Email server</h2>

        <form className='form-inline'>

          <div className='form-group'>
            <label htmlFor='MailServer-host'>SMTP server</label>{' '}
            <input
              type='text'
              className='form-control'
              id='MailServer-host'
              ref='host'
              placeholder='smtp.example.com'
              />
          </div>{' '}

          <div className='form-group'>
            <label htmlFor='MailServer-port'>port</label>{' '}
            <input
              type='number'
              className='form-control'
              id='MailServer-port'
              ref='port'
              defaultValue='25'
              />
          </div>{' '}

          <div className='form-group'>
            <label htmlFor='MailServer-from'>
              email address of SubText app
            </label>{' '}
            <input
              type='text'
              className='form-control'
              id='MailServer-from'
              ref='from'
              placeholder='subtext@example.com'
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
              })
            }}
            >Save</StatefulButton>

        </form>
      </div>
    )
  }

}
