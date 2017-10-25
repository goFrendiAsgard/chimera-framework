/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

// core-preprocessor
describe('core-chiml-parser', function () {
  // getTrueRootChain
  describe('parseChiml', function () {
    it('should transform chiml into an object and the result should be the same with it\'s JSON counterpart', function (done) {
      fs.readFile(path.join(__dirname, 'fractures/test.chiml'), function (error, chainScript) {
        if (error) {
          return done(error)
        }
        chimera.coreChimlParser.parseChiml(chainScript, function (error, chimlChain) {
          if (error) {
            return done(error)
          }
          fs.readFile(path.join(__dirname, 'fractures/test.json'), function (error, chainScript) {
            if (error) {
              return done(error)
            }
            chimera.coreChimlParser.parseChiml(chainScript, function (error, jsonChain) {
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
    it('should quote one line chiml containing a string with block delimiter', function (done) {
      chimera.coreChimlParser.parseChiml('|"Hello"-->', function (error, chainScript) {
        if (error) {
          return done(error)
        }
        assert.equal('"Hello"-->', chainScript)
        done()
      })
    })
  })
})
