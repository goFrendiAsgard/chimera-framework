'use strict'
require('cache-require-paths')

module.exports = {
  run,
  get
}

const exec = require('child_process').exec
const COLOR_FG_YELLOW = '\x1b[33m'
const COLOR_FG_RED = '\x1b[31m'
const COLOR_RESET = '\x1b[0m'

function redirectStream (stream, foreground) {
  let data = ''
  let firstData = true
  stream.on('data', (chunk) => {
    if (firstData) {
      process.stderr.write(foreground)
      firstData = false
    }
    data += chunk
  })
  stream.on('end', () => {
    firstData = true
    process.stderr.write(data + COLOR_RESET)
  })
}

function redirectSubProcessStream (subProcess) {
  redirectStream(subProcess.stdout, COLOR_FG_YELLOW)
  redirectStream(subProcess.stderr, COLOR_FG_RED)
}

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
  const subProcess = exec(command, execOptions, (error) => {
    if (error) {
      process.stderr.write(COLOR_FG_RED)
      console.error(error)
      process.stderr.write(COLOR_RESET)
    }
  })
  redirectSubProcessStream(subProcess)
  return subProcess
}

/**
 * Run command
 * Example:
 *  get('ls -al', {'cwd':'/home/myUser'}, function(error, data, stderr){
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
  const subProcess = exec(command, execOptions, execCallback)
  redirectSubProcessStream(subProcess)
  return subProcess
}
