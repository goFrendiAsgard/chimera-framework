/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

const expectedTestResult = 'Hello world\nHello sekai\n6, 8, 10\nstring from circle.js\n76.96902001294993\n100'

// core-preprocessor
describe('core', function () {
  it('should be able to execute json script and get the result', function (done) {
    chimera.core.executeChain('{"ins":"num", "verbose":1, "do":"(num*num)-->"}', [10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.strictEqual(result, 100)
      return done()
    })
  })

  it('should be able to assign variable even if the variable is not exist before', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/variable-assignment.chiml'), [], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.strictEqual(result, 'bar')
      return done()
    })
  })

  it('should be able to execute square.chiml and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/square.chiml'), [10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.strictEqual(result, 100)
      return done()
    })
  })

  it('should be able to execute square.chain.js and get the result (without vars parameter)', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/square.chain.js'), [10], function (error, result) {
      if (error) {
        return done(error)
      }
      assert.strictEqual(result, 100)
      return done()
    })
  })

  it('should be able to execute square.chiml and get the result (without vars parameter)', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/square.chiml'), [10], function (error, result) {
      if (error) {
        return done(error)
      }
      assert.strictEqual(result, 100)
      return done()
    })
  })

  it('should be able to execute showPi.chiml and get the result (without ins and vars parameter)', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/showPi.chiml'), function (error, result) {
      if (error) {
        return done(error)
      }
      assert.strictEqual(result, 3.141592653589793)
      return done()
    })
  })

  it('should able to execute `chimera fractures/showBestNumberPalindrome.chiml`', function (done) {
    chimera.core.executeChain((path.join(__dirname, 'fractures/showBestNumberPalindrome.chiml')), function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 37)
      return done()
    })
  })

  it('should be able to setnov.chiml and yield error', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/setnov.chiml'), function (error) {
      if (error) {
        assert.equal('Error', error.name)
        return done()
      }
      return done(new Error('Error expected, but no error found'))
    })
  })

  it('should be able to execute malformed.json and yield error', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/malformed.json'), function (error) {
      if (error) {
        assert.equal('YAMLException', error.name)
        return done()
      }
      return done(new Error('Error expected, but no error found'))
    })
  })

  it('should be able to execute malformed json script and yield error', function (done) {
    chimera.core.executeChain('{', function (error) {
      if (error) {
        assert.equal('YAMLException', error.name)
        return done()
      }
      return done(new Error('Error expected, but no error found'))
    })
  })

  it('should be able to execute test.chiml and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/test.chiml'), [5, 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, expectedTestResult)
      return done()
    })
  })

  it('should be able to execute test-alternative.chiml and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/test-alternative.chiml'), [5, 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, expectedTestResult)
      return done()
    })
  })

  it('should be able to execute test-indonesia.chiml and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/test-indonesia.chiml'), [5, 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, expectedTestResult)
      return done()
    })
  })

  it('should be able to execute test-jawa.chiml and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/test-jawa.chiml'), [5, 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, expectedTestResult)
      return done()
    })
  })

  it('should be able to execute test.yml and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/test.yml'), [5, 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, expectedTestResult)
      return done()
    })
  })

  it('should be able to execute test.json and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/test.json'), [5, 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, expectedTestResult)
      return done()
    })
  })

  it('should be able to execute test-standard.json and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/test-standard.json'), [5, 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, expectedTestResult)
      return done()
    })
  })

  it('should be able to run shell command defined in a nested chain', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/square.nestedChain.chiml'), [4], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result, 16)
      return done()
    })
  })

  it('should be able to parse inputs correctly, either as string or as block array', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/input-variation.chiml'), [], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      let input = {'a': 'emiya', 'b': 'name', 'c': {'d': 'emiya', 'e': 'name'}, 'f': ['emiya', 'name', ['emiya', 'name']]}
      let expectedTestResult = {'str': input, 'dict': input}
      assert.deepEqual(result, expectedTestResult)
      return done()
    })
  })

  describe('map and filter', function () {
    it('should run fractures/functional.chiml successfully', function (done) {
      chimera.core.executeChain(path.join(__dirname, 'fractures/functional.chiml'), function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, {map: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], filter: [2, 4, 6, 8, 10]})
        done()
      })
    })
  })
})
