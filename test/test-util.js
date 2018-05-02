/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

const stringSample = '4.8'
const numberSample = 4.8
const arraySample = []
const objectSample = {}
const functionSample = () => { return null }
const nullSample = null
const undefinedSample = undefined

const jsonFileName = path.join(__dirname, '/tmp/test.json')
const quotedJsonFileName = chimera.util.getQuoted(jsonFileName)

// cmd
describe('util', function () {
  describe('getInspectedObject', function () {
    it('should get inspected object of array', function (done) {
      let result = chimera.util.getInspectedObject([1, 2, 3])
      assert.equal(result, '[ 1, 2, 3 ]')
      done()
    })

    it('should get inspected object of object', function (done) {
      let result = chimera.util.getInspectedObject({a: 1, b: 2, c: 3, d: 'abc'})
      assert.equal(result, '{ a: 1, b: 2, c: 3, d: \'abc\' }')
      done()
    })

    it('should get inspected object of long object', function (done) {
      let result = chimera.util.getInspectedObject({a: 'abcdef', b: 'abcdef', c: 'abcdef', d: 'abcdef', e: 'abcdef', f: 'abcdef'})
      assert.equal(result, '{ a: \'abcdef\',\n  b: \'abcdef\',\n  c: \'abcdef\',\n  d: \'abcdef\',\n  e: \'abcdef\',\n  f: \'abcdef\' }')
      done()
    })
  })

  describe('getFilteredObject', function () {
    let originalObject = {a: 1, b: 2, c: 3, d: 4, e: {f: 5}}
    let filteredObject = chimera.util.getFilteredObject(originalObject, ['b', 'd'])

    it('should return an object without filtered key', function (done) {
      assert.deepEqual(filteredObject, {a: 1, c: 3, e: {f: 5}})
      done()
    })

    it('should maintain the reference between original object and filtered object', function (done) {
      originalObject.e.f = 6
      assert.equal(filteredObject.e.f, 6)
      done()
    })
  })

  describe('getUnwrapped', function () {
    it('should return an unwrapped string', function (done) {
      let result = chimera.util.getUnwrapped('  (abc) ')
      assert.equal(result, 'abc')
      done()
    })
  })

  describe('getDeepCopiedObject', function () {
    let originalObject = {a: 1, b: 2, c: 3, d: 4, e: {f: 5}}
    let copiedObject = chimera.util.getDeepCopiedObject(originalObject)

    it('should return the identic copied object', function (done) {
      assert.deepEqual(copiedObject, originalObject)
      done()
    })

    it('should not return the same object', function (done) {
      assert.notEqual(copiedObject, originalObject)
      done()
    })

    it('copied object should be independent to originalObject', function (done) {
      originalObject.e.f = 6
      assert.equal(copiedObject.e.f, 5)
      done()
    })
  })

  describe('getPatchedObject', function () {
    let originalObject = {a: 1, b: 2, c: 3, d: 4, e: {f: 5}}
    let patchedObject = chimera.util.getPatchedObject(originalObject, {d: 6, e: {g: 7}, h: 8})

    it('should return patched object', function (done) {
      assert.deepEqual(patchedObject, {a: 1, b: 2, c: 3, d: 6, e: {f: 5, g: 7}, h: 8})
      done()
    })

    it('patched object should be independent to originalObject', function (done) {
      originalObject.e.f = 6
      assert.equal(patchedObject.e.f, 5)
      done()
    })
  })

  describe('getQuoted', function () {
    it('should quote the string and add escape characters', function (done) {
      let result = chimera.util.getQuoted('"abc"\n\'def\'')
      assert.equal(result, '"\\"abc\\"\\n\'def\'"')
      done()
    })
  })

  describe('getUnquoted', function () {
    it('should getUnquoted the string and remove escape characters', function (done) {
      let result = chimera.util.getUnquoted('"\\"abc\\"\\n\'def\'"')
      assert.equal(result, '"abc"\n\'def\'')
      done()
    })
  })

  describe('getSmartSplitted', function () {
    it('should split a string into array, but take care of quotes', function (done) {
      let result = chimera.util.getSmartSplitted('"abc,def", \'ghi,jkl\', mno', ',')
      assert.deepEqual(result, ['"abc,def"', "'ghi,jkl'", 'mno'])
      done()
    })
  })

  describe('isString', function () {
    it('should recognize string as string', function (done) {
      assert.equal(chimera.util.isString(stringSample), true)
      done()
    })

    it('should not recognize number as string', function (done) {
      assert.equal(chimera.util.isString(numberSample), false)
      done()
    })

    it('should not recognize array as string', function (done) {
      assert.equal(chimera.util.isString(arraySample), false)
      done()
    })

    it('should not recognize object as string', function (done) {
      assert.equal(chimera.util.isString(objectSample), false)
      done()
    })

    it('should not recognize function as string', function (done) {
      assert.equal(chimera.util.isString(functionSample), false)
      done()
    })

    it('should not recognize null as string', function (done) {
      assert.equal(chimera.util.isString(nullSample), false)
      done()
    })

    it('should not recognize undefined as string', function (done) {
      assert.equal(chimera.util.isString(undefinedSample), false)
      done()
    })
  })

  describe('isArray', function () {
    it('should not recognize string as array', function (done) {
      assert.equal(chimera.util.isArray(stringSample), false)
      done()
    })

    it('should not recognize number as array', function (done) {
      assert.equal(chimera.util.isArray(numberSample), false)
      done()
    })

    it('should not recognize array as array', function (done) {
      assert.equal(chimera.util.isArray(arraySample), true)
      done()
    })

    it('should not recognize object as array', function (done) {
      assert.equal(chimera.util.isArray(objectSample), false)
      done()
    })

    it('should recognize function as array', function (done) {
      assert.equal(chimera.util.isArray(functionSample), false)
      done()
    })

    it('should not recognize null as array', function (done) {
      assert.equal(chimera.util.isArray(nullSample), false)
      done()
    })

    it('should not recognize undefined as array', function (done) {
      assert.equal(chimera.util.isArray(undefinedSample), false)
      done()
    })
  })

  describe('isObject', function () {
    it('should not recognize string as object', function (done) {
      assert.equal(chimera.util.isObject(stringSample), false)
      done()
    })

    it('should not recognize number as object', function (done) {
      assert.equal(chimera.util.isObject(numberSample), false)
      done()
    })

    it('should recognize array as object', function (done) {
      assert.equal(chimera.util.isObject(arraySample), true)
      done()
    })

    it('should recognize object as object', function (done) {
      assert.equal(chimera.util.isObject(objectSample), true)
      done()
    })

    it('should recognize function as object', function (done) {
      assert.equal(chimera.util.isObject(functionSample), true)
      done()
    })

    it('should recognize null as object', function (done) {
      assert.equal(chimera.util.isObject(nullSample), true)
      done()
    })

    it('should not recognize undefined as object', function (done) {
      assert.equal(chimera.util.isObject(undefinedSample), false)
      done()
    })
  })

  describe('isRealObject', function () {
    it('should not recognize string as object', function (done) {
      assert.equal(chimera.util.isRealObject(stringSample), false)
      done()
    })

    it('should not recognize number as object', function (done) {
      assert.equal(chimera.util.isRealObject(numberSample), false)
      done()
    })

    it('should not recognize array as object', function (done) {
      assert.equal(chimera.util.isRealObject(arraySample), false)
      done()
    })

    it('should recognize object as object', function (done) {
      assert.equal(chimera.util.isRealObject(objectSample), true)
      done()
    })

    it('should not recognize function as object', function (done) {
      assert.equal(chimera.util.isRealObject(functionSample), false)
      done()
    })

    it('should not recognize null as object', function (done) {
      assert.equal(chimera.util.isRealObject(nullSample), false)
      done()
    })

    it('should not recognize undefined as object', function (done) {
      assert.equal(chimera.util.isRealObject(undefinedSample), false)
      done()
    })
  })

  describe('isUndefined', function () {
    it('should not recognize string as undefined', function (done) {
      assert.equal(chimera.util.isUndefined(stringSample), false)
      done()
    })

    it('should not recognize number as undefined', function (done) {
      assert.equal(chimera.util.isUndefined(numberSample), false)
      done()
    })

    it('should not recognize array as undefined', function (done) {
      assert.equal(chimera.util.isUndefined(arraySample), false)
      done()
    })

    it('should not recognize object as undefined', function (done) {
      assert.equal(chimera.util.isUndefined(objectSample), false)
      done()
    })

    it('should not recognize function as undefined', function (done) {
      assert.equal(chimera.util.isUndefined(functionSample), false)
      done()
    })

    it('should not recognize null as undefined', function (done) {
      assert.equal(chimera.util.isUndefined(nullSample), false)
      done()
    })

    it('should recognize undefined as undefined', function (done) {
      assert.equal(chimera.util.isUndefined(undefinedSample), true)
      done()
    })
  })

  describe('isNull', function () {
    it('should not recognize string as null', function (done) {
      assert.equal(chimera.util.isNull(stringSample), false)
      done()
    })

    it('should not recognize number as null', function (done) {
      assert.equal(chimera.util.isNull(numberSample), false)
      done()
    })

    it('should not recognize array as null', function (done) {
      assert.equal(chimera.util.isNull(arraySample), false)
      done()
    })

    it('should not recognize object as null', function (done) {
      assert.equal(chimera.util.isNull(objectSample), false)
      done()
    })

    it('should not recognize function as null', function (done) {
      assert.equal(chimera.util.isNull(functionSample), false)
      done()
    })

    it('should recognize null as null', function (done) {
      assert.equal(chimera.util.isNull(nullSample), true)
      done()
    })

    it('should not recognize undefined as null', function (done) {
      assert.equal(chimera.util.isNull(undefinedSample), false)
      done()
    })
  })

  describe('isNullOrUndefined', function () {
    it('should not recognize string as null or undefined', function (done) {
      assert.equal(chimera.util.isNullOrUndefined(stringSample), false)
      done()
    })

    it('should not recognize number as null or undefined', function (done) {
      assert.equal(chimera.util.isNullOrUndefined(numberSample), false)
      done()
    })

    it('should not recognize array as null or undefined', function (done) {
      assert.equal(chimera.util.isNullOrUndefined(arraySample), false)
      done()
    })

    it('should not recognize object as null or undefined', function (done) {
      assert.equal(chimera.util.isNullOrUndefined(objectSample), false)
      done()
    })

    it('should not recognize function as null or undefined', function (done) {
      assert.equal(chimera.util.isNullOrUndefined(functionSample), false)
      done()
    })

    it('should recognize null as null or undefined', function (done) {
      assert.equal(chimera.util.isNullOrUndefined(nullSample), true)
      done()
    })

    it('should recognize undefined as null or undefined', function (done) {
      assert.equal(chimera.util.isNullOrUndefined(undefinedSample), true)
      done()
    })
  })

  describe('isFunction', function () {
    it('should not recognize string as function', function (done) {
      assert.equal(chimera.util.isFunction(stringSample), false)
      done()
    })

    it('should not recognize number as function', function (done) {
      assert.equal(chimera.util.isFunction(numberSample), false)
      done()
    })

    it('should not recognize array as function', function (done) {
      assert.equal(chimera.util.isFunction(arraySample), false)
      done()
    })

    it('should not recognize object as function', function (done) {
      assert.equal(chimera.util.isFunction(objectSample), false)
      done()
    })

    it('should recognize function as function', function (done) {
      assert.equal(chimera.util.isFunction(functionSample), true)
      done()
    })

    it('should not recognize null as function', function (done) {
      assert.equal(chimera.util.isFunction(nullSample), false)
      done()
    })

    it('should not recognize undefined as function', function (done) {
      assert.equal(chimera.util.isFunction(undefinedSample), false)
      done()
    })
  })

  describe('getStretchedString', function () {
    it('should add filler characters if string length is less than expected length', function (done) {
      assert.equal(chimera.util.getStretchedString('abc', 6, '.'), 'abc...')
      done()
    })

    it('should by default use `.` as filler character', function (done) {
      assert.equal(chimera.util.getStretchedString('abc', 6), 'abc...')
      done()
    })

    it('should not do anything if string length is more than expected length', function (done) {
      assert.equal(chimera.util.getStretchedString('abc', 2, '.'), 'abc')
      done()
    })
  })

  describe('getSlicedString', function () {
    it('should not do anything if string length is less than expected length', function (done) {
      assert.equal(chimera.util.getSlicedString('abc', 6), 'abc')
      done()
    })

    it('should slice string if string length is more than expected length', function (done) {
      assert.equal(chimera.util.getSlicedString('abcdefghijklmn', 9), 'abcdef...')
      done()
    })
  })

  describe('writeJsonFile', function () {
    let obj = {a: 1, b: 2, c: [1, 2, 3], d: {e: 4, f: 5}, g: 'string'}

    it('should write JSON object to a file', function (done) {
      chimera.util.writeJsonFile(jsonFileName, obj, function (error) {
        if (error) {
          return done(error)
        }
        chimera.cmd.get('cat ' + quotedJsonFileName, function (error, result) {
          if (error) {
            done(error)
          }
          assert.equal(result, '{"a":1,"b":2,"c":[1,2,3],"d":{"e":4,"f":5},"g":"string"}')
          done()
        })
      })
    })
  })

  describe('writePrettyJsonFile', function () {
    let obj = {a: 1, b: 2, c: [1, 2, 3], d: {e: 4, f: 5}, g: 'string'}

    it('should write JSON object to a file (pretty)', function (done) {
      chimera.util.writePrettyJsonFile(jsonFileName, obj, function (error) {
        if (error) {
          return done(error)
        }
        chimera.cmd.get('cat ' + quotedJsonFileName, function (error, result) {
          if (error) {
            done(error)
          }
          let expected = JSON.stringify(obj, null, 2)
          assert.equal(result, expected)
          done()
        })
      })
    })
  })

  describe('readJsonFile', function () {
    let obj = {a: 1, b: 2, c: [1, 2, 3], d: {e: 4, f: 5}, g: 'string'}

    it('should read JSOn object from a file', function (done) {
      chimera.util.readJsonFile(jsonFileName, function (error, result) {
        if (error) {
          return done(error)
        }
        assert.deepEqual(result, obj)
        chimera.cmd.get('rm ' + quotedJsonFileName, function (error) {
          if (error) {
            return done(error)
          }
          done()
        })
      })
    })

    it('should throw error when accessing non-existing file', function (done) {
      chimera.util.readJsonFile('nonExistFile.json', function (error) {
        if (error) {
          assert.equal('Error', error.name)
          return done()
        }
        return done(new Error('Error expected but no error found'))
      })
    })

    it('should throw error when accessing malformed json file', function (done) {
      chimera.util.readJsonFile(path.join(__dirname, 'fractures/malformed.json'), function (error) {
        if (error) {
          assert.equal('SyntaxError', error.name)
          return done()
        }
        return done(new Error('Error expected but no error found'))
      })
    })
  })
})
