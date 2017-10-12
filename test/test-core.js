/* eslint-env mocha */

const path = require('path')
const chai = require('chai');  
const chimera = require('../index.js')
const assert = chai.assert; 

// core-preprocessor
describe('core', function () {
  // executeChain
  describe('executeChain', function () {
    it('should be able to execute factor.chiml and get the result', function (done) {
      chimera.executeChain(path.join(__dirname, 'fractures/factor.chiml'), [10], {}, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, '10: 2 5')
        done()
      })
    })
  })
})
