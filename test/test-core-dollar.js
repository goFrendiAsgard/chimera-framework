/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

describe('chain dollar', function () {
  describe('runChain', function () {
    it('should runChain(square.chiml, 4) successfully', function (done) {
      chimera.coreDollar.runChain(path.resolve(__dirname, 'fractures/square.chiml'), 4, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, '16')
        done()
      })
    })
  })
  describe('assignValue', function () {
    it('should assignValue(5) successfully', function (done) {
      chimera.coreDollar.assignValue(5, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.equal(result, 5)
        done()
      })
    })
    it('should assignValue(5, 6, 7) successfully', function (done) {
      chimera.coreDollar.assignValue(5, 6, 7, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, [5, 6, 7])
        done()
      })
    })
  })
  describe('concat', function () {
    it('should concat("Hello ", "world") successfully', function (done) {
      chimera.coreDollar.concat('Hello ', 'world', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, 'Hello world')
        done()
      })
    })
  })
  describe('join', function () {
    it('should join(["a", "b", "c"], ", ") successfully', function (done) {
      chimera.coreDollar.join(['a', 'b', 'c'], ', ', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, 'a, b, c')
        done()
      })
    })
  })
  describe('split', function () {
    it('should split("a, b, c", ", ") successfully', function (done) {
      chimera.coreDollar.split('a, b, c', ', ', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, ['a', 'b', 'c'])
        done()
      })
    })
  })
  describe('push', function () {
    it('should push(["a", "b", "c"], "d") successfully', function (done) {
      chimera.coreDollar.push(['a', 'b', 'c'], 'd', function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, ['a', 'b', 'c', 'd'])
        done()
      })
    })
  })
  describe('merge', function () {
    it('should merge(["a", "b", "c"], ["d", "e", "f"]) successfully', function (done) {
      chimera.coreDollar.merge(['a', 'b', 'c'], ['d', 'e', 'f'], function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, ['a', 'b', 'c', 'd', 'e', 'f'])
        done()
      })
    })
  })
})
