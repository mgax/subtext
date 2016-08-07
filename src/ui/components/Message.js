import classNames from 'classnames'

export default function Message({
      message: {me, time, message: {text}},
      bleedUp, bleedDown,
    }) {
  let cls = classNames('message', {
    'message-me': me,
    'message-peer': ! me,
    'message-bleedUp': bleedUp,
    'message-bleedDown': bleedDown,
  })
  return (
    <li className={cls}>
      <div className='time'>{moment(time).calendar()}</div>
      {text}
    </li>
  )
}
