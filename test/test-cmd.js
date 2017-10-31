/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

// cmd
describe('cmd', function () {
  // cmd.get
  describe('cmd.get', function () {
    it('should run command line and get the result', function (done) {
      chimera.cmd.get(chimera.util.getQuoted(path.resolve(__dirname, 'fractures/cpp/substract')) + ' 10 6', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, '4\n')
        done()
      })
    })
  })

  // cmd.run
  describe('cmd.run', function () {
    it('should return an object with process id', function (done) {
      let result = chimera.cmd.run(chimera.util.getQuoted(path.resolve(__dirname, 'fractures/cpp/substract')) + ' 10 6')
      assert.exists(result.pid)
      done()
    })
  })
})
