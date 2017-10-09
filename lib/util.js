#! /usr/bin/env node
'use strict'

module.exports = {
  getInspectedObject,
  getFilteredObject,
  getUnwrapped,
  deepCopy,
  quote,
  unquote,
  eisn,
  smartSplit,
  isString,
  isArray,
  isObject,
  isRealObject,
  isUndefined,
  isNull,
  isNullOrUndefined,
  isFunction,
  'addTrailingSlash': addTrailingSlash,
  'formatNanoSecond': formatNanoSecond,
  'deepCopy': deepCopy,
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
  'sliceString': sliceString,
  'runCallbackOrReturn': runCallbackOrReturn,
  'applyShowJsonCallback': applyShowJsonCallback
}

const coreutil = require('util')
const async = require('neo-async')
const fs = require('fs')
const clone = require('clone')
const cmd = require('./cmd')
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

function applyShowJsonCallback (callback) {
  if (isFunction(callback)) {
    return callback
  }
  // callback is not function, create a default one
  return function (error, result) {
    let errorStatus = !!error
    let errorStack = error ? error.stack : ''
    let errorMessage = error ? error.message : ''
    let errorName = error ? error.name : ''
    console.log(JSON.stringify({
      'result': result,
      'error': errorStatus,
      'errorMessage': errorMessage,
      'errorName': errorName,
      'errorStack': errorStack
    }))
  }
}

function sliceString (string, limit, callback) {
  if (string.length > limit - 4) {
    string = string.substring(0, limit - 4) + '...'
  }
  return runCallbackOrReturn(callback, string)
}

function stretchString (string, length, filler = '.', callback) {
  while (string.length < length) {
    string += filler
  }
  return runCallbackOrReturn(callback, string)
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
  if (dirPath.charAt(dirPath.length - 1) != '/') {
    dirPath += '/'
  }
  return runCallbackOrReturn(callback, dirPath)
}

/**
 * Execute command if srcFile is newer than dstFile
 * Example:
 *  eisn('Program.java', 'Program.class', 'javac Program.java', function(result, success, errorMessage){
 *     console.log(result)
 *  })
 * Output:
 *  {'is_command_executed' : true}
 *
 * @param {string} srcFile
 * @param {string} dstFile
 * @param {string} command
 * @param {function} callback
 *
 */

function eisn (srcFile, dstFile, command, finalCallback) {
  finalCallback = applyShowJsonCallback(finalCallback)
  // define result
  let result = {'is_command_executed': true}
  let srcStat = null
  async.series([
    // get source fileStat
    (callback) => {
      fs.stat(srcFile, (error, stat) => {
        if (error) {
          // cannot get stat of srcFile, stop here
          console.error('[ERROR] Cannot get file stat of ' + srcFile)
          console.error(error)
          result.is_command_executed = false
          finalCallback(error, result)
        } else {
          srcStat = stat
          callback()
        }
      })
    },
    // try access destination file
    (callback) => {
      fs.access(dstFile, function (error) {
        if (error) {
          // dstFile isn't accessible, assume it doesn't exists, execute the command and stop here
          eisnExecuteCommand(command, finalCallback)
        } else {
          callback()
        }
      })
    },
    // get destination fileStat
    (callback) => {
      fs.stat(dstFile, function (error, dstStat) {
        if (!error && srcStat.mtime > dstStat.mtime) {
          eisnExecuteCommand(command, finalCallback)
        } else if (error) {
          result.is_command_executed = false
          finalCallback(error, result)
        } else {
          result.is_command_executed = false
          finalCallback(null, result)
        }
      })
    }
  ], (error, result) => {})
}

function eisnExecuteCommand (command, finalCallback) {
  // dstFile isn't accessible, assume it doesn't exists, execute the command and stop here
  cmd.get(command, function (data, success, stderr) {
    if (success) {
      finalCallback(result, true)
    } else {
      result.is_command_executed = false
      finalCallback(result, true)
    }
  })
}

// this one is for benchamarking
/**
 * Get formatted nano second
 * Example:
 *  formatNanoSecond(process.hrtime())
 * Output:
 *  string, formatted nano second
 */
function formatNanoSecond (time, callback) {
  let nano = time[0] * 1e9 + time[1]
  let result = nano.toLocaleString()
  return runCallbackOrReturn(callback, result)
}

// deep copy an object, now using clone rather than JSON.parse(JSON.stringify(obj))
function deepCopy (obj, callback) {
  let newObj = clone(obj)
  return runCallbackOrReturn(callback, newObj)
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
  return runCallbackOrReturn(callback, obj)
}

function smartSplit (string, delimiter, callback) {
  let singleQuoteCount = 0
  let doubleQuoteCount = 0
  let data = []
  let word = ''
  for (let i = 0; i < string.length; i++) {
    let chr = string.charAt(i)
    if (string.substring(i, i + delimiter.length) == delimiter && doubleQuoteCount % 2 == 0 && singleQuoteCount % 2 == 0) {
      data.push(word.trim())
      i += delimiter.length - 1
      word = ''
    } else {
      if (chr == "'") {
        singleQuoteCount++
      } else if (chr == '"') {
        doubleQuoteCount++
      }
      word += chr
    }
  }
  data.push(word.trim())
  return runCallbackOrReturn(callback, data)
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
  string = string.replace(/"/g, '\\\"')
  string = string.replace(/\n/g, '\\n')
  string = string.trim()
  string = '"' + string + '"'
  return runCallbackOrReturn(callback, string)
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
function unquote (string, callback) {
  string = string.trim()
  if (string.match(/^"(.*)"$/g) || string.match(/^'(.*)'$/g)) {
    string = string.substring(1, string.length - 1)
    string = string.replace(/\\\\/g, '\\')
  }
  return runCallbackOrReturn(callback, string)
}

function isString (value, callback) {
  let result = typeof (value) === 'string' || value instanceof String
  return runCallbackOrReturn(callback, result)
}

function isArray (value, callback) {
  let result = Array.isArray(value) || value instanceof Array
  return runCallbackOrReturn(callback, result)
}

function isObject (value, callback) {
  let result = typeof (value) === 'object' || value instanceof Object
  return runCallbackOrReturn(callback, result)
}

function isRealObject (value, callback) {
  let result = !isNullOrUndefined(value) && !isString(value) && !isArray(value) && isObject(value)
  return runCallbackOrReturn(callback, result)
}

function isUndefined (value, callback) {
  let result = typeof (value) === 'undefined'
  return runCallbackOrReturn(callback, result)
}

function isNull (value, callback) {
  let result = value === null
  return runCallbackOrReturn(callback, result)
}

function isNullOrUndefined (value, callback) {
  let result = typeof (value) === 'undefined' || value === null
  return runCallbackOrReturn(callback, result)
}

function isFunction (value, callback) {
  let result = typeof (value) === 'function'
  return runCallbackOrReturn(callback, result)
}

function replaceKey (obj, oldKey, newKey, callback) {
  // using dictionary? parse it recursively
  if (isRealObject(oldKey) && isNullOrUndefined(newKey)) {
    let dict = oldKey
    for (let key in dict) {
      obj = replaceKey(obj, key, dict[key])
    }
    return runCallbackOrReturn(callback, obj)
  }
  // real action
  if (oldKey in obj) {
    obj[newKey] = deepCopy(obj[oldKey])
    delete obj[oldKey]
  }
  return runCallbackOrReturn(callback, obj)
}

function assignDefaultValue (obj, key, value, callback) {
  // using dictionary? parse it recursively
  if (isRealObject(key) && isNullOrUndefined(value)) {
    let dict = key
    for (let key in dict) {
      obj = assignDefaultValue(obj, key, dict[key])
    }
    return runCallbackOrReturn(callback, obj)
  }
  // real action
  if (!(key in obj)) {
    obj[key] = value
  }
  return runCallbackOrReturn(callback, obj)
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
