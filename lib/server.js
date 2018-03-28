'use strict'

module.exports = {
  serve,
  processChain
}

const core = require('./core.js')
const web = require('./web.js')
const util = require('./util.js')
const fs = require('fs')
const async = require('neo-async')
const path = require('path')

function serve (options, callback) {
  let port
  if (util.isRealObject(options) && 'port' in options) {
    port = options.port
  } else {
    port = process.env.PORT || '3000'
  }

  let processCwd = process.cwd()
  let WEBCONFIG = {
    'routes': [{
      'route': '/',
      'method': 'all',
      'chain': path.join(__dirname, 'chains/server.route.chiml')
    }],
    'staticPath': null,
    'faviconPath': null,
    'viewPath': null,
    'startupHook': path.join(__dirname, 'chains/server.startupHook.chiml'),
    'beforeRequestHook': path.join(__dirname, 'chains/server.beforeRequestHook.chiml'),
    'afterRequestHook': path.join(__dirname, 'chains/server.afterRequestHook.chiml'),
    'localStartupHook': false,
    'localBeforeRequestHook': false,
    'localAfterRequestHook': false
  }

  async.parallel([
    (next) => {
      fs.access(path.join(processCwd, 'startup.chiml'), fs.constants.R_OK, (error) => {
        if (!error) {
          WEBCONFIG.localStartupHook = 'startup.chiml'
          console.warn('Startup hook found')
        }
        next()
      })
    },
    (next) => {
      fs.access(path.join(processCwd, 'beforeRequest.chiml'), fs.constants.R_OK, (error) => {
        if (!error) {
          WEBCONFIG.localBeforeRequestHook = 'beforeRequest.chiml'
          console.warn('BeforeRequest hook found')
        }
        next()
      })
    },
    (next) => {
      fs.access(path.join(processCwd, 'afterRequest.chiml'), fs.constants.R_OK, (error) => {
        if (!error) {
          WEBCONFIG.localAfterRequestHook = 'afterRequest.chiml'
          console.warn('AfterRequest hook found')
        }
        next()
      })
    }
  ], (error) => {
    if (error) {
      console.error(error)
    }
    createServer(WEBCONFIG, port, callback)
  })

  function createServer (WEBCONFIG, port, callback) {
    try {
      // create web app
      let app = web.createApp(WEBCONFIG)
      // start the web app
      let server = app.listen(port, function () {
        console.log('Chimera service started at port ' + port)
        let result = {'server': server, 'app': app, 'port': port}
        callback(null, result)
      })
    } catch (error) {
      callback(error, null)
    }
  }
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
  return file.search(publishedDirectory) === 0
}

function processChain (state, callback) {
  let request = state.request
  let input = util.isArray(request.body.input) ? request.body.input : []
  let chain = util.isString(request.body.chain) ? request.body.chain : 'index.chiml'
  let result = {'success': true, 'errorMessage': '', 'data': ''}
  if (isInsidePublishedDirectory(chain)) {
    core.executeChain(chain, input, {}, (error, output) => {
      if (!error) {
        // success
        result.data = output
        return callback(null, {'data': result})
      } else {
        // chain call failed
        result.success = false
        result.errorMessage = error.message
        return callback(null, {'data': result})
      }
    })
  } else {
    // not authorized
    result.success = false
    result.errorMessage = 'Cannot access ' + chain
    return callback(null, {'data': result})
  }
}
