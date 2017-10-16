/* eslint-env mocha */

const fs = require('fs')
const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

describe('chain dollar', function () {
  describe('runChain', function () {
    it('execute runChain(square.chiml, 4) successfully', function (done) {
      chimera.dollar.runChain(path.resolve(__dirname, 'fractures/square.chiml'), 4, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, '16')
        done()
      })
    })
  })
  describe('assignValue', function () {
    it('execute assignValue(5) successfully', function (done) {
      chimera.dollar.assignValue(5, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, 5)
        done()
      })
    })
    it('execute assignValue(5, 6, 7) successfully', function (done) {
      chimera.dollar.assignValue(5, 6, 7, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, [5, 6, 7])
        done()
      })
    })
  })
  describe('concat', function () {
    it('execute concat("Hello ", "world") successfully', function (done) {
      chimera.dollar.concat('Hello ', 'world', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, 'Hello world')
        done()
      })
    })
  })
  describe('join', function () {
    it('execute join(["a", "b", "c"], ", ") successfully', function (done) {
      chimera.dollar.join(['a', 'b', 'c'], ', ', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, 'a, b, c')
        done()
      })
    })
  })
  describe('split', function () {
    it('execute split("a, b, c", ", ") successfully', function (done) {
      chimera.dollar.split('a, b, c', ', ', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, ['a', 'b', 'c'])
        done()
      })
    })
  })
  describe('push', function () {
    it('execute push(["a", "b", "c"], "d") successfully', function (done) {
      chimera.dollar.push(['a', 'b', 'c'], 'd', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, ['a', 'b', 'c', 'd'])
        done()
      })
    })
  })

})
