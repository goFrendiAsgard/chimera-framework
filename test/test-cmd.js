/* eslint-env mocha */

const chai = require('chai');  
const chimera = require('../index.js')
const assert = chai.assert; 

// cmd
describe('cmd', function () {
  // cmd.get
  describe('cmd.get', function () {
    it('should run command line and get the result', function (done) {
      chimera.cmd.get('node ' + __dirname + '/fractures/square.js 10', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, '100\n')
        done()
      })
    })
  })
  // cmd.run
  describe('cmd.run', function() {
    it('should return an object with process id', function (done) {
      let result = chimera.cmd.run('node ' + __dirname + '/fractures/square.js 10')
      assert.exists(result.pid)
      done()
    })
  })
})
