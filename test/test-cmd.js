/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

// cmd
describe('cmd', function () {
  // cmd.get
  describe('cmd.get', function () {
    it('should run command line and get the result (with no option present)', function (done) {
      chimera.cmd.get(chimera.util.getQuoted(path.resolve(__dirname, 'fractures/cpp/substract')) + ' 10 6', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, '4\n')
        done()
      })
    })

    it('should run command line and get the result (with option present)', function (done) {
      chimera.cmd.get(chimera.util.getQuoted('fractures/cpp/substract') + ' 10 6', {cwd: __dirname}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, '4\n')
        done()
      })
    })

    it('should return object if no callback present', function (done) {
      let result = chimera.cmd.get(chimera.util.getQuoted('fractures/cpp/substract') + ' 10 6', {cwd: __dirname})
      assert.exists(result)
      done()
    })

    it('should yield error for non existing command)', function (done) {
      chimera.cmd.get('setnov.exe', function (error, result) {
        assert.exists(error)
        done()
      })
    })
  })

  // cmd.run
  describe('cmd.run', function () {
    it('should return an object with process id (with no option present)', function (done) {
      let result = chimera.cmd.run(chimera.util.getQuoted(path.resolve(__dirname, 'fractures/cpp/substract')) + ' 10 6')
      assert.exists(result.pid)
      done()
    })

    it('should return an object with process id (with option present)', function (done) {
      let result = chimera.cmd.run(chimera.util.getQuoted('fractures/cpp/substract') + ' 10 6', {cwd: __dirname})
      assert.exists(result.pid)
      done()
    })

    it('should return an object with process id (for non existing command)', function (done) {
      let result = chimera.cmd.run('setnov.exe')
      assert.exists(result.pid)
      done()
    })
  })
})
