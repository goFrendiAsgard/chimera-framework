'use strict'
require('cache-require-paths')

module.exports = eisn

const fs = require('fs-extra')
const async = require('neo-async')
const cmd = require('./cmd.js')
const util = require('./util.js')

/**
 * Execute command if srcFile is newer than dstFile
 * Example:
 *  eisn('Program.java', 'Program.class', 'javac Program.java', function(result, success, errorMessage){
 *     console.log(result)
 *  })
 * Output:
 *  {'isCommandExecuted' : true}
 *
 * @param {string} srcFile
 * @param {string} dstFile
 * @param {string} command
 * @param {function} callback
 *
 */
function eisn (srcFile, dstFile, command, finalCallback) {
  finalCallback = getDefaultCallback(finalCallback)
  // define result
  const result = {isCommandExecuted: false}
  let srcStat, dstStat
  async.parallel([
    // get source fileStat
    (next) => {
      fs.stat(srcFile, (error, stat) => {
        if (!error) {
          srcStat = stat
        }
        next(error, result)
      })
    },
    // get destination fileStat
    (next) => {
      fs.stat(dstFile, (error, stat) => {
        if (!error) {
          dstStat = stat
        }
        next(null, result)
      })
    }
  ], (error) => {
    if (error || util.isNullOrUndefined(srcStat)) {
      return finalCallback(error, result)
    }
    if (util.isNullOrUndefined(dstStat) || (srcStat.mtime > dstStat.mtime)) {
      return eisnExecuteCommand(command, finalCallback)
    }
    return finalCallback(null, result)
  })
}

function getDefaultCallback (callback) {
  if (util.isFunction(callback)) {
    return callback
  }
  // callback is not function, create a default one
  return function (error, result) {
    let errorStatus = !!error
    let errorMessage = error ? error.message : ''
    console.log(JSON.stringify({
      'result': result,
      'error': errorStatus,
      'errorMessage': errorMessage
    }))
  }
}

function eisnExecuteCommand (command, finalCallback) {
  // dstFile isn't accessible, assume it doesn't exists, execute the command and stop here
  cmd.get(command, function (error, result) {
    if (error) {
      finalCallback(error, result)
    } else {
      let eisnResult = {isCommandExecuted: true}
      finalCallback(null, eisnResult)
    }
  })
}
