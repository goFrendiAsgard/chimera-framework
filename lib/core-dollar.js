#! /usr/bin/env node
'use strict'

module.exports = {
  loadJs,
  'runChain': runChainAndCallback,
  'assignValue': assignValueAndCallback,
  'prompt': readInputAndCallback,
  'print': printAndCallback,
  'concat': concatAndCallback,
  'join': joinAndCallback,
  'split': splitAndCallback,
  'push': pushToArrayAndCallback,
  'eisn': wrappedEisn
}

const core = require('./core.js')
const eisn = require('./eisn')
const util = require('./util.js')
const readline = require('readline')

function wrappedEisn (srcFile, dstFile, command, finalCallback) {
  eisn(srcFile, dstFile, command, finalCallback)
}

function assignValueAndCallback (...args) {
  // the last argument is callback
  let callback = args.pop()
  // determine output
  let output
  if (args.length === 1) {
    output = args[0]
  } else {
    output = args
  }
  // run the callback
  callback(null, output)
}

function loadJs (moduleName, namespace = null) {
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

function runChainAndCallback (...args) {
  let callback = args.pop()
  // get the chain
  let chain = args.shift()
  core.executeChain(chain, args, {}, callback)
}

function readInputAndCallback (textPrompt = '', callback) {
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr
  })
  rl.question(textPrompt + ' ', (answer) => {
    rl.close()
    callback(null, answer)
  })
}

function pushToArrayAndCallback (array, value, callback) {
  array.push(value)
  callback(null, array)
}

function printAndCallback (message = '', callback) {
  console.log(message)
  callback(null, message)
}

function concatAndCallback (...args) {
  let callback = args.pop()
  let result = ''
  for (let value of args) {
    result += String(value)
  }
  callback(null, result)
}

function joinAndCallback (...args) {
  let callback = args.pop()
  let value = []
  let delimiter = ''
  if (args.length === 1) {
    value = args[0]
  } else if (args.length > 1) {
    value = args[0]
    delimiter = args[1]
  }
  callback(null, value.join(delimiter))
}

function splitAndCallback (...args) {
  let callback = args.pop()
  let value = ''
  let delimiter = ''
  if (args.length === 1) {
    value = args[0]
  } else if (args.length > 1) {
    value = args[0]
    delimiter = args[1]
  }
  callback(null, value.split(delimiter))
}
