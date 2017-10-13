#! /usr/bin/env node
'use strict'

module.exports = {
  getInspectedObject,
  getFilteredObject,
  getUnwrapped,
  deepCopy,
  quote,
  unquote,
  smartSplit,
  isString,
  isArray,
  isObject,
  isRealObject,
  isUndefined,
  isNull,
  isNullOrUndefined,
  isFunction,
  addTrailingSlash,
  patchObject,
  readJson,
  writeJson,
  stretchString,
  sliceString
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
  return string.trim().substring(1, string.length - 1)
}

function sliceString (string, limit, callback) {
  if (string.length > limit - 4) {
    string = string.substring(0, limit - 4) + '...'
  }
  return string
}

function stretchString (string, length, filler = '.', callback) {
  while (string.length < length) {
    string += filler
  }
  return string
}

/**
 * Preprocess dirPath by adding '/' at the end of dirPath
 * Example:
 *  addTrailingSlash('dir/anotherDir')
 *  addTrailingSlash('dir/anotherDir/')
 * Output:
 *  'dir/anotherDir/'
 *
 * @param {string} dirPath
 */
function addTrailingSlash (dirPath, callback) {
  if (dirPath.charAt(dirPath.length - 1) !== '/') {
    dirPath += '/'
  }
  return dirPath
}

// deep copy an object, now using clone rather than JSON.parse(JSON.stringify(obj))
function deepCopy (obj, callback) {
  let newObj = clone(obj)
  return newObj
}

// patch object with patcher
function patchObject (obj, patcher, callback) {
  obj = deepCopy(obj)
  patcher = deepCopy(patcher)
  // patch
  for (let key in patcher) {
    if ((key in obj) && isRealObject(obj[key]) && isRealObject(patcher[key])) {
      // recursive patch for if value type is object
      try {
        obj[key] = patchObject(obj[key], patcher[key])
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

function smartSplit (string, delimiter, callback) {
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
 *  quote('string')
 * Output:
 *  '"string"'
 *
 * @param {string} string
 */
function quote (string, callback) {
  return JSON.stringify(String(string))
}

/**
 * unquote a string
 * Example:
 *  unquote('"string"')
 *  unquote("'string'")
 * Output:
 *  'string'
 *
 * @param {string} string
 */
function unquote (string) {
  string = string.trim()
  if (string.match(/^"(.*)"$/g) || string.match(/^'(.*)'$/g)) {
    string = string.substring(1, string.length - 1)
    string = string.replace(/\\\\/g, '\\')
  }
  return string
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
  return !isNullOrUndefined(value) && !isString(value) && !isArray(value) && isObject(value)
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

function readJson (jsonFile, callback) {
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

function writeJson (jsonFile, obj, callback) {
  let content = stringify(obj)
  fs.writeFile(jsonFile, content, callback)
}
