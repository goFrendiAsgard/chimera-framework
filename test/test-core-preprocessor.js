/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const chai = require('chai');  
const chimera = require('../index.js')
const assert = chai.assert; 


// core-preprocessor
describe('core-preprocessor', function () {
  // getTrueRootChain
  describe('getTrueRootChain', function () {
    it('should transform chain into a standard', function (done) {
      fs.readFile(path.join(__dirname, 'fractures/test.json'), function (error, chainScript) {
        if (error) {
          return done(error)
        }
        let trueChain = chimera.preprocessor.getTrueRootChain(JSON.parse(chainScript))
        fs.readFile(path.join(__dirname, 'fractures/test-standard.json'), function (error, standardChainScript) {
          if (error) {
            return done(error)
          }
          assert.equal(JSON.stringify(trueChain), JSON.stringify(JSON.parse(standardChainScript)))
          done()
        })
      })
    })
  })
})
