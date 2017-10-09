#! /usr/bin/env node
'use strict'

module.exports = eisn

const fs = require('fs')
const cmd = require('./cmd.js')

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
