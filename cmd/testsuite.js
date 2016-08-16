import Mocha from 'mocha'

const TESTSUITE = `${__dirname}/../testsuite`

const mocha = new Mocha()
mocha.addFile(`${TESTSUITE}/messages.js`)
mocha.addFile(`${TESTSUITE}/publicApi.js`)
mocha.addFile(`${TESTSUITE}/privateApi.js`)
mocha.addFile(`${TESTSUITE}/sendMail.js`)
mocha.run()
