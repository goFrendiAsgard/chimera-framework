/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const chai = require('chai');  
const chimera = require('../index.js')
const assert = chai.assert; 


// core-preprocessor
describe('core-chiml-parser', function () {
  // getTrueRootChain
  describe('parseChiml', function () {
    it('should transform chiml into an object and the result should be the same with it\'s JSON counterpart', function (done) {
      fs.readFile(path.join(__dirname, 'fractures/test.chiml'), function (error, chainScript) {
        if (error) {
          return done(error)
        }
        chimera.chimlParser.parseChiml(chainScript, function (error, chimlChain) {
          if (error) {
            return done(error)
          }
          fs.readFile(path.join(__dirname, 'fractures/test.json'), function (error, chainScript) {
            if (error) {
              return done(error)
            }
            chimera.chimlParser.parseChiml(chainScript, function (error, jsonChain) {
              if (error) {
                return done(error)
              }
              assert.deepEqual(chimlChain, jsonChain)
              done()
            })
          })
        })
      })
    })
  })
})
