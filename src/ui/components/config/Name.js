import StatefulButton from '../StatefulButton.js'

export default class Name extends React.Component {

  render() {
    let { value, setName } = this.props

    return (
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
              defaultValue={value}
              />
          </div>{' '}

          <StatefulButton
            type='submit'
            className='btn btn-primary'
            onClick={async () => {
              await setName(this.refs.name.value)
            }}
            >Save</StatefulButton>

        </form>
      </div>
    )
  }

}
