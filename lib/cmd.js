#! /usr/bin/env node
'use strict'

module.exports = {
  run,
  get
}

let exec = require('child_process').exec

/**
 * Run command
 * Example:
 *  runCommand('ls -al')
 *  runCommand('ls -al', {'cwd': '/home/myUser'})
 *
 * For more information about options, please visit (https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback)
 *
 * @param (string) command
 * @param (object) options
 *
 */
function run (command, options) {
  let execOptions
  if (typeof options === 'undefined') {
    execOptions = null
  } else {
    execOptions = options
  }
  return exec(command, execOptions)
}

/**
 * Run command
 * Example:
 *  getString('ls -al', {'cwd':'/home/myUser'}, function(error, data, stderr){
 *      console.log('data');
 *  })
 *
 * For more information about options, please visit (https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback)
 *
 * @param (string) command
 * @param (object) options
 * @param (function) callback
 *
 */
function get (command, options, callback) {
  let execOptions, execCallback
  if (typeof options === 'function') {
    execCallback = options
    execOptions = null
  } else {
    execOptions = options
    execCallback = callback
  }
  return exec(command, execOptions, (function () {
    return function (err, data, stderr) {
      if (!execCallback) {
        return
      }
      execCallback(err, data, stderr)
    }
  })(execCallback))
}
