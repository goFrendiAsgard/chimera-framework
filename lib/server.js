#! /usr/bin/env node
'use strict'

module.exports = {
  'processChain': processChain,
  'serve': serve
}

const core = require('./core.js')
const web = require('./web.js')
const util = require('./util.js')
const fs = require('fs')
const async = require('neo-async')

let WEBCONFIG = {
  'routes': [{
    'route': '/',
    'method': 'all',
    'chain': __dirname + '/chains/server.route.yaml'
  }],
  'startupHook': __dirname + '/chains/server.startupHook.yaml',
  'beforeRequestHook': __dirname + '/chains/server.beforeRequestHook.yaml',
  'afterRequestHook': __dirname + '/chains/server.afterRequestHook.yaml',
  'localStartupHook': false,
  'localBeforeRequestHook': false,
  'localAfterRequestHook': false
}

function isInsidePublishedDirectory (file) {
  // get published directory
  let publishedDirectory = process.env.PUBLISHED
  if (!publishedDirectory) {
    return true
  }
  publishedDirectory = path.resolve(publishedDirectory)
  file = path.resolve(file)
  // is file in publised directory
  return file.search(publishedDirectory) == 0
}

function runChainCallback (result, callback) {
  let response = {'response': JSON.stringify(result)}
  callback(null, response)
}

function processChain (state, callback) {
  let request = state.request
  let input = util.isArray(request.body.input) ? request.body.input : []
  let chain = util.isString(request.body.chain) ? request.body.chain : 'index.yaml'
  let result = {'success': true, 'errorMessage': '', 'response': ''}
  if (isInsidePublishedDirectory(chain)) {
    // call chimera process
    try {
      core.executeChain(chain, input, (error, output) => {
        if (!error) {
          // success
          result.response = output
          runChainCallback(result, callback)
        } else {
          // chain call failed
          result.success = false
          result.errorMessage = error.message
          runChainCallback(result, callback)
        }
      })
    } catch (error) {
      // failed to run
      result.success = false
      result.errorMessage = 'Cannot run ' + chain
      runChainCallback(result, callback)
    }
  } else {
    // not authorized
    result.success = false
    result.errorMessage = 'Cannot access ' + chain
    runChainCallback(result, callback)
  }
}

function createServer (WEBCONFIG, port, callback) {
  try {
    // create web app
    let app = web.createApp(WEBCONFIG)
    // start the web app
    app.listen(port, function () {
      console.log('Chimera service started at port ' + port)
      let result = {'app': app, 'port': port}
      callback(null, result)
    })
  } catch (error) {
    callback(error, null)
  }
}

function serve (callback) {
  let port = process.env.PORT || '3000'
  async.parallel([
    (next) => {
      fs.access(process.cwd() + '/startup.yaml', fs.constants.R_OK, (error) => {
        if (!error) {
          WEBCONFIG.localStartupHook = 'startup.yaml'
          console.warn('Startup hook found')
        }
        next()
      })
    },
    (next) => {
      fs.access(process.cwd() + '/beforeRequest.yaml', fs.constants.R_OK, (error) => {
        if (!error) {
          WEBCONFIG.localBeforeRequestHook = 'beforeRequest.yaml'
          console.warn('BeforeRequest hook found')
        }
        next()
      })
    },
    (next) => {
      fs.access(process.cwd() + '/afterRequest.yaml', fs.constants.R_OK, (error) => {
        if (!error) {
          WEBCONFIG.localAfterRequestHook = 'afterRequest.yaml'
          console.warn('AfterRequest hook found')
        }
        next()
      })
    }
  ], (error, result) => { createServer(WEBCONFIG, port, callback) })
}
