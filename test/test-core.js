/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

const clearCompilationFileCommand = 'cd '+path.join(__dirname+'/fractures') + ' && rm '+path.join(__dirname, 'fractures/.*.cjson')
const expectedTestResult = 'Hello world\nHello sekai\n6, 8, 10\nstring from circle.js\n76.96902001294993\n100'

// core-preprocessor
describe('core', function () {
  // executeChain
  describe('executeChain', function () {
    it('should be able to execute square.chiml and get the result', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/square.chiml'), [10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.strictEqual(result, 100)
        done()
      })
    })
    it('should be able to execute test.chiml and get the result', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/test.chiml'), [5, 10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, expectedTestResult)
        done()
      })
    })
    it('should be able to execute test-indonesia.chiml and get the result', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/test-indonesia.chiml'), [5, 10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, expectedTestResult)
        done()
      })
    })
    it('should be able to execute test-jawa.chiml and get the result', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/test-jawa.chiml'), [5, 10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, expectedTestResult)
        done()
      })
    })
    it('should be able to execute test.yml and get the result', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/test.yml'), [5, 10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, expectedTestResult)
        done()
      })
    })
    it('should be able to execute test.json and get the result', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/test.json'), [5, 10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, expectedTestResult)
        done()
      })
    })
    it('should be able to execute test-standard.json and get the result', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/test-standard.json'), [5, 10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, expectedTestResult)
        done()
      })
    })
    it('should be able to parse inputs correctly, either as string or as block array', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/input-variation.chiml'), [], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        let input = {"a":"emiya","b":"name","c":{"d":"emiya","e":"name"},"f":["emiya","name",["emiya","name"]]}
        let expectedTestResult = {'str':input, 'dict':input}
        assert.deepEqual(result, expectedTestResult)
        chimera.cmd.get(clearCompilationFileCommand, function (error, result) {
          if (error) {
            return done(error)
          }
          done()
        })
      })
    })
  })
})
