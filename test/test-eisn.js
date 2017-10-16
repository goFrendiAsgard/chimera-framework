/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

const originalSrcFile = path.join(__dirname, 'fractures/java/Substract.java')
const originalDstFile = path.join(__dirname, 'fractures/java/Substract.class')
const srcFile = path.join(__dirname, 'tmp/Substract.java')
const dstFile = path.join(__dirname, 'tmp/Substract.class')

describe('eisn', function () {
  it('should run command if dstFile does not exist', function (done) {
    chimera.cmd.get('cp '+originalSrcFile+' '+srcFile, function(error, result) {
      if (error) {
        return done(error)
      }
      chimera.eisn(srcFile, dstFile, 'javac '+srcFile, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, {isCommandExecuted:true})
        done()
      })
    })
  })
  it('should run command if dstFile exist but older than srcFile', function (done) {
    chimera.cmd.get('cp '+originalDstFile+' '+dstFile + ' && cp '+originalSrcFile+' '+srcFile, function(error, result) {
      if (error) {
        return done(error)
      }
      chimera.eisn(srcFile, dstFile, 'javac '+srcFile, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, {isCommandExecuted:true})
        done()
      })
    })
  })
  it('should not run command if dstFile exist and newer than srcFile', function (done) {
    chimera.eisn(srcFile, dstFile, 'javac '+srcFile, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {isCommandExecuted:false})
      chimera.cmd.get('rm '+srcFile+' && rm '+dstFile, function(error, result) {
        if (error) {
          return done(error)
        }
        done()
      })
    })
  })
})
