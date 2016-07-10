import Modal from './Modal.js'
import Name from './config/Name.js'

export default function ConfigModal({ config, setName }) {

  return (
    <Modal title="Configuration">
      <Name
        value={config.name}
        setName={setName}
        />
    </Modal>
  )
}
