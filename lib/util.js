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
  getParsedJson,
  readJsonFile,
  writeJsonFile,
  writePrettyJsonFile
}

const requireOnce = require('./require-once.js')
let clone, coreutil, fs, stringify

let NOT_JSON_CACHE = []

function getParsedJson (str) {
  if (NOT_JSON_CACHE.indexOf(str) > -1) {
    return str
  }
  try {
    return JSON.parse(str)
  } catch (error) {
    NOT_JSON_CACHE.push(str)
    return str
  }
}

function getInspectedObject (variables) {
  coreutil = requireOnce('util')
  return coreutil.inspect(variables, false, null)
}

function getFilteredObject (obj, exceptionKeys) {
  let newObj = {}
  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; i++) {
    if (exceptionKeys.indexOf(keys[i]) === -1) {
      newObj[keys[i]] = obj[keys[i]]
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
  if (!patcher) {
    return obj
  }
  let newObj, newPatcher
  if (clone) {
    newObj = getDeepCopiedObject(obj)
    newPatcher = getDeepCopiedObject(patcher)
  } else {
    newObj = obj
    newPatcher = patcher
  }
  // patch
  const keys = Object.keys(newPatcher)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    if ((key in newObj) && isRealObject(newObj[key]) && isRealObject(newPatcher[key])) {
      // recursive patch for if value type is newObject
      try {
        newObj[key] = getPatchedObject(newObj[key], newPatcher[key], false)
      } catch (error) {
      // do nothing, just skip
      }
    } else {
      // simple replacement if value type is not newObject
      newObj[key] = newPatcher[key]
    }
  }
  return newObj
}

function getSmartSplitted (string, delimiter) {
  if (string.indexOf(delimiter) === -1) {
    return [string]
  }
  let evenSingleQuoteCount = true
  let evenDoubleQuoteCount = true
  let data = []
  let word = ''
  for (let i = 0; i < string.length; i++) {
    const chr = string[i]
    if (evenDoubleQuoteCount && evenSingleQuoteCount && string.substring(i, i + delimiter.length) === delimiter) {
      data.push(word.trim())
      i += delimiter.length - 1
      word = ''
    } else {
      if (chr === "'") {
        evenSingleQuoteCount = !evenSingleQuoteCount
      } else if (chr === '"') {
        evenDoubleQuoteCount = !evenDoubleQuoteCount
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
  return getParsedJson(String(string).trim())
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
  return value === null || typeof (value) === 'undefined'
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
