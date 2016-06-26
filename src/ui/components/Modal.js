export default function Modal({title, children, buttons = []}) {
  return (
    <div className='modal fade'>
      <div className='modal-dialog' role='document'>
        <div className='modal-content'>
          <div className='modal-header'>
            <button type='button' className='close'
              data-dismiss='modal' aria-label='Close'>
              <span aria-hidden='true'>&times;</span>
            </button>
            <h4 className='modal-title'>{title}</h4>
          </div>
          <div className='modal-body'>
            {children}
          </div>
          <div className='modal-footer'>
            {buttons}
          </div>
        </div>
      </div>
    </div>
  )
}
