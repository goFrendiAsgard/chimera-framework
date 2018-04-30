'use strict'

module.exports = {
  serve
}

const requireOnce = require('./require-once.js')
let web, util, fs, async, path

function serve (options, callback) {
  web = requireOnce('./web.js')
  util = requireOnce('./util.js')
  fs = requireOnce('fs-extra')
  async = requireOnce('neo-async')
  path = requireOnce('path')

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
      'chain': path.join(__dirname, 'chains/server.route.js')
    }],
    'staticPath': null,
    'faviconPath': null,
    'viewPath': null,
    'startupHook': path.join(__dirname, 'chains/server.startupHook.js'),
    'beforeRequestHook': path.join(__dirname, 'chains/server.beforeRequestHook.js'),
    'afterRequestHook': path.join(__dirname, 'chains/server.afterRequestHook.js'),
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
