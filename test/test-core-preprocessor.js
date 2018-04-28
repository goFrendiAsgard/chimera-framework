/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

// core-preprocessor
describe('core-preprocessor', function () {
  // getTrueRootChain
  it('should transform chain into a standard', function (done) {
    fs.readFile(path.join(__dirname, 'fractures/test.json'), function (error, chainScript) {
      if (error) {
        return done(error)
      }
      let trueChain = chimera.corePreprocessor.getTrueRootChain(JSON.parse(chainScript))
      fs.readFile(path.join(__dirname, 'fractures/test-standard.json'), function (error, standardChainScript) {
        if (error) {
          return done(error)
        }
        standardChainScript = String(standardChainScript)
        assert.equal(JSON.stringify(trueChain), JSON.stringify(JSON.parse(standardChainScript)))
        return done()
      })
    })
  })

  it('should run fractures/functional-shorthand.chiml successfully', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/functional-shorthand.chiml'), function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {map: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], filter: [2, 4, 6, 8, 10]})
      done()
    })
  })
})
