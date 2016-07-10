import StatefulButton from '../StatefulButton.js'

export default function KeyPair({ generateKeyPair }) {
  return (
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
  )
}
