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
const copySrcFileCmd = 'cp ' + quotedOriginalSrcFile + ' ' + quotedSrcFile + ' && sleep 0.001'
const removeSrcAndDstFileCmd = 'rm '+quotedSrcFile + ' && rm ' + quotedDstFile + ' && sleep 0.001'

describe('eisn', function () {
  this.timeout(5000)
  it('should run command if dstFile does not exist', function (done) {
    chimera.cmd.get(copySrcFileCmd, function (error, result) {
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
    chimera.cmd.get(copySrcFileCmd, function (error, result) {
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
      chimera.cmd.get(removeSrcAndDstFileCmd, function (error, result) {
        if (error) {
          return done(error)
        }
        done()
      })
    })
  })
})

describe('dollar.eisn', function () {
  this.timeout(5000)
  it('should run command if dstFile does not exist', function (done) {
    chimera.cmd.get(copySrcFileCmd, function (error, result) {
      if (error) {
        return done(error)
      }
      chimera.dollar.eisn(srcFile, dstFile, 'javac ' + quotedSrcFile, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, {isCommandExecuted: true})
        done()
      })
    })
  })
  it('should run command if dstFile exist but older than srcFile', function (done) {
    chimera.cmd.get(copySrcFileCmd, function (error, result) {
      if (error) {
        return done(error)
      }
      chimera.dollar.eisn(srcFile, dstFile, 'javac ' + quotedSrcFile, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, {isCommandExecuted: true})
        done()
      })
    })
  })
  it('should not run command if dstFile exist and newer than srcFile', function (done) {
    chimera.dollar.eisn(srcFile, dstFile, 'javac ' + quotedSrcFile, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.deepEqual(result, {isCommandExecuted: false})
      chimera.cmd.get(removeSrcAndDstFileCmd, function (error, result) {
        if (error) {
          return done(error)
        }
        done()
      })
    })
  })
})
