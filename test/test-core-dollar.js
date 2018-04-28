/* eslint-env mocha */

const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

describe('chain dollar', function () {
  describe('assignValue', function () {
    it('should assignValue(5) successfully', function (done) {
      let result = chimera.coreDollar.assignValue(5)
      assert.equal(result, 5)
      done()
    })

    it('should assignValue(5, 6, 7) successfully', function (done) {
      let result = chimera.coreDollar.assignValue(5, 6, 7)
      assert.deepEqual(result, [5, 6, 7])
      done()
    })
  })

  describe('concat', function () {
    it('should concat("Hello ", "world") successfully', function (done) {
      let result = chimera.coreDollar.concat('Hello ', 'world')
      assert.deepEqual(result, 'Hello world')
      done()
    })
  })

  describe('join', function () {
    it('should join(["a", "b", "c"], ", ") successfully', function (done) {
      let result = chimera.coreDollar.join(['a', 'b', 'c'], ', ')
      assert.equal(result, 'a, b, c')
      done()
    })

    it('should join(["a", "b", "c"]) successfully', function (done) {
      let result = chimera.coreDollar.join(['a', 'b', 'c'])
      assert.equal(result, 'abc')
      done()
    })
  })

  describe('split', function () {
    it('should split("a, b, c", ", ") successfully', function (done) {
      let result = chimera.coreDollar.split('a, b, c', ', ')
      assert.deepEqual(result, ['a', 'b', 'c'])
      done()
    })

    it('should split("abc") successfully', function (done) {
      let result = chimera.coreDollar.split('abc')
      assert.deepEqual(result, ['a', 'b', 'c'])
      done()
    })
  })

  describe('push', function () {
    it('should push(["a", "b", "c"], "d") successfully', function (done) {
      let result = chimera.coreDollar.push(['a', 'b', 'c'], 'd')
      assert.deepEqual(result, ['a', 'b', 'c', 'd'])
      done()
    })
  })

  describe('merge', function () {
    it('should merge(["a", "b", "c"], ["d", "e", "f"]) successfully', function (done) {
      let result = chimera.coreDollar.merge(['a', 'b', 'c'], ['d', 'e', 'f'])
      assert.deepEqual(result, ['a', 'b', 'c', 'd', 'e', 'f'])
      done()
    })
  })
})
