import Modal from './Modal.js'
import Name from './config/Name.js'
import Smtp from './config/Smtp.js'

export default function ConfigModal({ config, setName, setSmtp, testSmtp }) {

  return (
    <Modal title="Configuration">

      <p>Public contact URL: <code>{config.myCardUrl}</code></p>

      <Name
        value={config.name}
        setName={setName}
        />

      <Smtp
        smtp={config.smtp}
        setSmtp={setSmtp}
        testSmtp={testSmtp}
        />

    </Modal>
  )
}
