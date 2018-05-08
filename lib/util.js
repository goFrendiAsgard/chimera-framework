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
  writeJsonFile,
  writePrettyJsonFile
}

const requireOnce = require('./require-once.js')
let clone, coreutil, fs, stringify

function getInspectedObject (variables) {
  coreutil = requireOnce('util')
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

function getDeepCopiedObject (obj) {
  clone = requireOnce('clone')
  const newObj = clone(obj, false, 50)
  return newObj
}

// patch object with patcher
function getPatchedObject (obj, patcher, clone = true) {
  if (clone) {
    obj = getDeepCopiedObject(obj)
    patcher = getDeepCopiedObject(patcher)
  }
  // patch
  const keys = isNullOrUndefined(patcher) ? [] : Object.keys(patcher)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if ((key in obj) && isRealObject(obj[key]) && isRealObject(patcher[key])) {
      // recursive patch for if value type is object
      try {
        obj[key] = getPatchedObject(obj[key], patcher[key], false)
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
  stringify = requireOnce('json-stringify-safe')
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
  fs = requireOnce('fs')
  fs.readFile(jsonFile, function (error, data) {
    if (error) {
      callback(error, {})
    } else {
      try {
        const obj = JSON.parse(String(data))
        callback(null, obj)
      } catch (error) {
        callback(error, {})
      }
    }
  })
}

function writeJsonFile (jsonFile, obj, callback) {
  fs = requireOnce('fs')
  stringify = requireOnce('json-stringify-safe')
  const content = stringify(obj)
  fs.writeFile(jsonFile, content, callback)
}

function writePrettyJsonFile (jsonFile, obj, callback) {
  fs = requireOnce('fs')
  stringify = requireOnce('json-stringify-safe')
  const content = stringify(obj, null, 2)
  fs.writeFile(jsonFile, content, callback)
}
