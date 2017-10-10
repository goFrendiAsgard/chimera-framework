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
  'patchObject': patchObject,
  'replaceKey': replaceKey,
  'assignDefaultValue': assignDefaultValue,
  'readYaml': readYaml,
  'readJson': readJson,
  'parseJsonOrYaml': parseJsonOrYaml,
  'readJsonOrYaml': readJsonOrYaml,
  'writeYaml': writeYaml,
  'writeJson': writeJson,
  'stretchString': stretchString,
  'sliceString': sliceString
}

const coreutil = require('util')
const fs = require('fs')
const clone = require('clone')
const yaml = require('js-yaml')
const stringify = require('json-stringify-safe')

// run the callback (if present) and return the output
function runCallbackOrReturn (callback, output, error = null) {
  if (typeof (callback) === 'function') {
    callback(error, output)
  }
  return output
}

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
  string = string.replace(/"/g, '\\"')
  string = string.replace(/\n/g, '\\n')
  string = string.trim()
  string = '"' + string + '"'
  return string
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

function replaceKey (obj, oldKey, newKey) {
  // using dictionary? parse it recursively
  if (isRealObject(oldKey) && isNullOrUndefined(newKey)) {
    let dict = oldKey
    for (let key in dict) {
      obj = replaceKey(obj, key, dict[key])
    }
    return obj
  }
  // real action
  if (oldKey in obj) {
    obj[newKey] = deepCopy(obj[oldKey])
    delete obj[oldKey]
  }
  return obj
}

function assignDefaultValue (obj, key, value) {
  // using dictionary? parse it recursively
  if (isRealObject(key) && isNullOrUndefined(value)) {
    let dict = key
    for (let key in dict) {
      obj = assignDefaultValue(obj, key, dict[key])
    }
    return obj
  }
  // real action
  if (!(key in obj)) {
    obj[key] = value
  }
  return obj
}

function readYaml (yamlFile, callback) {
  fs.readFile(yamlFile, function (error, data) {
    if (error) {
      callback(error, {})
    } else {
      try {
        let obj = yaml.safeLoad(String(data), {'schema': yaml.FAILSAFE_SCHEMA})
        callback(null, obj)
      } catch (error) {
        callback(error, {})
      }
    }
  })
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

function parseJsonOrYaml (str, callback) {
  let obj = {}
  let error = null
  try {
    obj = JSON.parse(str)
  } catch (jsonError) {
    try {
      obj = yaml.safeLoad(String(str), {'schema': yaml.FAILSAFE_SCHEMA})
    } catch (yamlError) {
      obj = {}
      error = jsonError
      error.message = 'Invalid JSON or YAML'
      error.stack = jsonError.stack + '\n' + yamlError.stack
    }
  }
  return runCallbackOrReturn(callback, obj, error)
}

function readJsonOrYaml (file, callback) {
  fs.readFile(file, function (error, fileContent) {
    if (error) {
      callback(error, {})
    } else {
      parseJsonOrYaml(String(fileContent), callback)
    }
  })
}

function writeYaml (yamlFile, obj, callback) {
  let content = yaml.safeDump(obj, {skipInvalid: true, noRefs: true})
  fs.writeFile(yamlFile, content, callback)
}

function writeJson (jsonFile, obj, callback) {
  let content = stringify(obj)
  fs.writeFile(jsonFile, content, callback)
}
