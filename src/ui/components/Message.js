import classNames from 'classnames'

export default function Message({message: {me, time, message: {text}}}) {
  let cls = classNames('message', {'message-me': me})
  return (
    <li className={cls}>
      <div className='time'>{moment(time).calendar()}</div>
      {text}
    </li>
  )
}
