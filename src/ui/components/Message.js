import classNames from 'classnames'
import marked from 'marked'

class Renderer extends marked.Renderer {

  image() {
    return '[images are not supported]'
  }

  link(url, title, text) {
    if(! url.match(/^http[s]?:\/\//)) return ''
    return `<a href="${url}" target=_blank>${text}</a>`
  }

}

function render(text) {
  return marked(text, {
    renderer: new Renderer,
    sanitize: true,
  })
}

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
      <div className='markdown'
        dangerouslySetInnerHTML={{__html: render(text)}} />
    </li>
  )
}
