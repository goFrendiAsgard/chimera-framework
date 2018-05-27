'use strict'

const util = require('./util.js')
module.exports = {
  assignValue,
  concat,
  httpRequest,
  httpRequestBody,
  join,
  loadJs,
  merge,
  mongoExecute,
  print,
  push,
  split,
  util,
  eisn: eisnWrapper,
  prompt: readInputAndCallback,
  send: sendWrapper
}

const requireOnce = require('./require-once.js')
let readline, eisn, sender, mongo, request

function httpRequestBody (opts, callback) {
  request = requireOnce('request')
  request(opts, (error, response, body) => {
    callback(error, util.getParsedJson(body))
  })
}

function httpRequest (opts, callback) {
  request = requireOnce('request')
  request(opts, (error, response, body) => {
    body = util.getParsedJson(body)
    let data = {body}
    if (!error) {
      data.domain = response.domain
      data.statusCode = response.statusCode
      data.statusMessage = response.statusMessage
      data.url = response.url
      data.method = response.method
      data.headers = response.headers
      data.trailers = response.trailers
      data.rawHeaders = response.rawHeaders
      data.rawTrailers = response.rawTrailers
      data.complete = response.complete
      data.httpVersion = response.httpVersion
      data.httpVersionMajor = response.httpVersionMajor
      data.httpVersionMinor = response.httpVersionMinor
    }
    callback(error, data)
  })
}

function mongoExecute (dbConfig, functionName, ...args) {
  mongo = requireOnce('./mongo.js')
  mongo.execute(dbConfig, functionName, ...args)
}

function sendWrapper (host, chain, ...args) {
  sender = requireOnce('./sender.js')
  const callback = args.pop()
  sender.send(host, chain, args, callback)
}

function eisnWrapper (srcFile, dstFile, command, finalCallback) {
  eisn = requireOnce('./eisn.js')
  return eisn(srcFile, dstFile, command, finalCallback)
}

function assignValue (...args) {
  if (args.length === 1) {
    return args[0]
  }
  return args
}

function loadJs (moduleName, namespace) {
  let loadedObject = requireOnce(moduleName)
  if (util.isNullOrUndefined(namespace)) {
    return loadedObject
  }
  const namespacePartList = namespace.split('.')
  for (let i = 0; i < namespacePartList.length; i++) {
    const namespacePart = namespacePartList[i]
    loadedObject = loadedObject[namespacePart]
  }
  return loadedObject
}

function readInputAndCallback (textPrompt, callback) {
  readline = requireOnce('readline')
  const rl = readline.createInterface({
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
  for (let i = 0; i < array2.length; i++) {
    array1.push(array2[i])
  }
  return array1
}

function print (message) {
  return console.error(message)
}

function concat (...args) {
  let result = ''
  for (let i = 0; i < args.length; i++) {
    result += String(args[i])
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
