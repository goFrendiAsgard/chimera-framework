/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

const originalSrcFile = path.join(__dirname, 'fractures/java/Substract.java')
const srcFile = path.join(__dirname, 'tmp/Substract.java')
const dstFile = path.join(__dirname, 'tmp/Substract.class')
const quotedOriginalSrcFile = chimera.util.getQuoted(originalSrcFile)
const quotedSrcFile = chimera.util.getQuoted(srcFile)
const quotedDstFile = chimera.util.getQuoted(dstFile)

describe('eisn', function () {
  it('should run command if dstFile does not exist', function (done) {
    chimera.cmd.get('cp ' + quotedOriginalSrcFile + ' ' + quotedSrcFile, function (error, result) {
      if (error) {
        return done(error)
      }
      chimera.eisn(srcFile, dstFile, 'javac ' + quotedSrcFile, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, {isCommandExecuted: true})
        done()
      })
    })
  })
  it('should run command if dstFile exist but older than srcFile', function (done) {
    chimera.cmd.get('cp ' + quotedOriginalSrcFile + ' ' + quotedSrcFile, function (error, result) {
      if (error) {
        return done(error)
      }
      chimera.eisn(srcFile, dstFile, 'javac ' + quotedSrcFile, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, {isCommandExecuted: true})
        done()
      })
    })
  })
  it('should not run command if dstFile exist and newer than srcFile', function (done) {
    chimera.eisn(srcFile, dstFile, 'javac ' + quotedSrcFile, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {isCommandExecuted: false})
      chimera.cmd.get('rm ' + quotedSrcFile + ' && rm ' + quotedDstFile, function (error, result) {
        if (error) {
          return done(error)
        }
        done()
      })
    })
  })
})
