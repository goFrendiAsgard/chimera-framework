'use strict'

module.exports = eisn

const requireOnce = require('./require-once.js')
const util = require('./util.js')
let cmd, fs, nsync

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
  nsync = requireOnce('neo-async')
  fs = requireOnce('fs')
  // define result
  const result = {isCommandExecuted: false}
  let srcStat, dstStat
  nsync.parallel([
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

function eisnExecuteCommand (command, finalCallback) {
  // dstFile isn't accessible, assume it doesn't exists, execute the command and stop here
  cmd = requireOnce('./cmd.js')
  cmd.get(command, function (error, result) {
    const eisnResult = error ? result : {isCommandExecuted: true}
    finalCallback(error, eisnResult)
  })
}
