/* eslint-env mocha */

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const chimera = require('../index.js')

describe('chimera', function(){

  // cmd
  describe('cmd', function () {
    // cmd.get
    describe('cmd.get', function () {
      it('should run command line and get the result', function (done) {
        chimera.cmd.get('factor 10', function (error, result) {
          assert(result, '10: 2 5')
          done()
        })
      })
    })
    // cmd.run
    describe('cmd.run', function() {
      it('should not return null', function (done) {
        let result = chimera.cmd.run('factor 10')
        assert.notEqual(result, null)
        done()
      })
    })
  })

  // core-preprocessor
  describe('preprocessor', function () {
    describe('getTrueRootChain', function () {
      it('should transform chain into a standard', function (done) {
        fs.readFile(path.join(__dirname, 'fractures/test.json'), function (error, chainScript) {
          let trueChain = chimera.preprocessor.getTrueRootChain(JSON.parse(chainScript))
          fs.readFile(path.join(__dirname, 'fractures/test-standard.json'), function (error, standardChainScript) {
            let standardChain = JSON.parse(standardChainScript)
            assert.deepEqual(trueChain, standardChain)
            done()
          })
        })
      })
    })
  })
  // getTrueRootChain

})

