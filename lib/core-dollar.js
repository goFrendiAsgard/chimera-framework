'use strict'
require('cache-require-paths')

const readline = require('readline')
const util = require('./util.js')
const eisn = require('./eisn.js')
const sender = require('./sender.js')
const mongo = require('./mongo.js')

module.exports = {
  loadJs,
  util,
  assignValue,
  print,
  concat,
  join,
  split,
  push,
  merge,
  mongoExecute,
  eisn: eisnWrapper,
  send: sendWrapper,
  prompt: readInputAndCallback
}

function mongoExecute (dbConfig, functionName, ...args) {
  mongo.execute(dbConfig, functionName, ...args)
}

function sendWrapper (host, chain, ...args) {
  let callback = args.pop()
  sender.send(host, chain, args, callback)
}

function eisnWrapper (srcFile, dstFile, command, finalCallback) {
  return eisn(srcFile, dstFile, command, finalCallback)
}

function assignValue (...args) {
  if (args.length === 1) {
    return args[0]
  }
  return args
}

function loadJs (moduleName, namespace) {
  let loadedObject = require(moduleName)
  if (util.isNullOrUndefined(namespace)) {
    return loadedObject
  }
  let namespacePartList = namespace.split('.')
  for (let namespacePart of namespacePartList) {
    loadedObject = loadedObject[namespacePart]
  }
  return loadedObject
}

function readInputAndCallback (textPrompt, callback) {
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr
  })
  rl.question(textPrompt + ' ', (answer) => {
    rl.close()
    callback(null, answer)
  })
}

function push (array, value) {
  array.push(value)
  return array
}

function merge (array1, array2) {
  for (let element of array2) {
    array1.push(element)
  }
  return array1
}

function print (message) {
  return console.error(message)
}

function concat (...args) {
  let result = ''
  for (let value of args) {
    result += String(value)
  }
  return result
}

function join (...args) {
  let value = []
  let delimiter = ''
  if (args.length === 1) {
    value = args[0]
  } else if (args.length > 1) {
    value = args[0]
    delimiter = args[1]
  }
  return value.join(delimiter)
}

function split (...args) {
  let value = ''
  let delimiter = ''
  if (args.length === 1) {
    value = args[0]
  } else if (args.length > 1) {
    value = args[0]
    delimiter = args[1]
  }
  return value.split(delimiter)
}
