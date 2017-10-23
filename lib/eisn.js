#! /usr/bin/env node
'use strict'

module.exports = eisn

const fs = require('fs')
const async = require('async')
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
  let result = {'isCommandExecuted': true}
  let srcStat = null
  async.series([
    // get source fileStat
    (callback) => {
      fs.stat(srcFile, (error, stat) => {
        if (error) {
          // cannot get stat of srcFile, stop here
          result.isCommandExecuted = false
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
          result.isCommandExecuted = false
          finalCallback(error, result)
        } else {
          result.isCommandExecuted = false
          finalCallback(null, result)
        }
      })
    }
  ], (error, result) => {
    console.error(error)
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
  cmd.get(command, function (error, result, stderr) {
    if (error) {
      finalCallback(error, result)
    } else {
      let eisnResult = {isCommandExecuted: true}
      finalCallback(null, eisnResult)
    }
  })
}
