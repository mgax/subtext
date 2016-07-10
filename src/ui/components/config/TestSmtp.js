import StatefulButton from '../StatefulButton.js'

export default class TestSmtp extends React.Component {

  render() {
    let { smtp, testSmtp } = this.props
    let { result } = this.state || {}

    let errorMessage = (err) => {
      if(err.smtp) return err.smtp
      if(err.previous) return err.previous.code
      return JSON.stringify(err)
    }

    console.log('render', result)

    return (
      <div>
        <h3>Test email</h3>

        <form className='form-inline'>

          <StatefulButton
            type='submit'
            className='btn btn-primary'
            onClick={async () => {
              this.setState({result: null})
              this.setState({result: await testSmtp()})
            }}
            >Test</StatefulButton>{' '}

          {result && (
            result.success
              ? <span className="label label-success">success</span>
              : (
                <span>
                  <span className="label label-danger">failed</span>{' '}
                  {errorMessage(result.err)}
                </span>
              )
          )}

        </form>
      </div>
    )
  }

}
