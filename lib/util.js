'use strict'

module.exports = {
  getInspectedObject,
  getFilteredObject,
  getUnwrapped,
  getDeepCopiedObject,
  getPatchedObject,
  getQuoted,
  getUnquoted,
  getSmartSplitted,
  isString,
  isArray,
  isObject,
  isRealObject,
  isUndefined,
  isNull,
  isNullOrUndefined,
  isFunction,
  getStretchedString,
  getSlicedString,
  readJsonFile,
  writeJsonFile
}

const coreutil = require('util')
const fs = require('fs')
const clone = require('clone')
const stringify = require('json-stringify-safe')

function getInspectedObject (variables) {
  return coreutil.inspect(variables, false, null)
}

function getFilteredObject (obj, exceptionKeys) {
  let newObj = {}
  for (let key in obj) {
    if (exceptionKeys.indexOf(key) === -1) {
      newObj[key] = obj[key]
    }
  }
  return newObj
}

function getUnwrapped (string) {
  string = string.trim()
  return string.substring(1, string.length - 1)
}

function getSlicedString (string, limit) {
  if (string.length > limit) {
    string = string.substring(0, limit - 3) + '...'
  }
  return string
}

function getStretchedString (string, length, filler = '.') {
  while (string.length < length) {
    string += filler
  }
  return string
}

// deep copy an object, now using clone rather than JSON.parse(JSON.stringify(obj))
function getDeepCopiedObject (obj) {
  let newObj = clone(obj, false)
  return newObj
}

// patch object with patcher
function getPatchedObject (obj, patcher) {
  obj = getDeepCopiedObject(obj)
  patcher = getDeepCopiedObject(patcher)
  // patch
  for (let key in patcher) {
    if ((key in obj) && isRealObject(obj[key]) && isRealObject(patcher[key])) {
      // recursive patch for if value type is object
      try {
        obj[key] = getPatchedObject(obj[key], patcher[key])
      } catch (error) {
      // do nothing, just skip
      }
    } else {
      // simple replacement if value type is not object
      obj[key] = patcher[key]
    }
  }
  return obj
}

function getSmartSplitted (string, delimiter) {
  let singleQuoteCount = 0
  let doubleQuoteCount = 0
  let data = []
  let word = ''
  for (let i = 0; i < string.length; i++) {
    let chr = string.charAt(i)
    if (string.substring(i, i + delimiter.length) === delimiter && doubleQuoteCount % 2 === 0 && singleQuoteCount % 2 === 0) {
      data.push(word.trim())
      i += delimiter.length - 1
      word = ''
    } else {
      if (chr === "'") {
        singleQuoteCount++
      } else if (chr === '"') {
        doubleQuoteCount++
      }
      word += chr
    }
  }
  data.push(word.trim())
  return data
}

/**
 * quote a string
 * Example:
 *  getQuoted('string')
 * Output:
 *  '"string"'
 *
 * @param {string} string
 */
function getQuoted (string) {
  if (!string.match(/"/g)) {
    return '"' + string + '"'
  }
  return stringify(String(string))
}

/**
 * getUnquoted a string
 * Example:
 *  getUnquoted('"string"')
 *  getUnquoted("'string'")
 * Output:
 *  'string'
 *
 * @param {string} string
 */
function getUnquoted (string) {
  string = String(string)
  string = string.trim()
  return JSON.parse(string)
}

function isString (value) {
  return typeof (value) === 'string' || value instanceof String
}

function isArray (value) {
  return Array.isArray(value) || value instanceof Array
}

function isObject (value) {
  return typeof (value) === 'object' || value instanceof Object
}

function isRealObject (value) {
  return !isNullOrUndefined(value) && !isFunction(value) && !isArray(value) && isObject(value)
}

function isUndefined (value) {
  return typeof (value) === 'undefined'
}

function isNull (value) {
  return value === null
}

function isNullOrUndefined (value) {
  return typeof (value) === 'undefined' || value === null
}

function isFunction (value) {
  return typeof (value) === 'function'
}

function readJsonFile (jsonFile, callback) {
  fs.readFile(jsonFile, function (error, data) {
    if (error) {
      callback(error, {})
    } else {
      try {
        let obj = JSON.parse(String(data))
        callback(null, obj)
      } catch (error) {
        callback(error, {})
      }
    }
  })
}

function writeJsonFile (jsonFile, obj, callback) {
  let content = stringify(obj)
  fs.writeFile(jsonFile, content, callback)
}
