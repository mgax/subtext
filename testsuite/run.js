import Mocha from 'mocha'

const mocha = new Mocha()
mocha.addFile('testsuite/messages.js')
mocha.addFile('testsuite/identityserver.js')
mocha.run()
