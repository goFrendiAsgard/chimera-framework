#! /usr/bin/env node
'use strict'

module.exports = {
  'createApp': createApp
}

let async = require('neo-async')
let express = require('express')
let favicon = require('serve-favicon')
let logger = require('morgan')
let cookieParser = require('cookie-parser')
let bodyParser = require('body-parser')
let session = require('express-session')
let fileUpload = require('express-fileupload')
let engines = require('consolidate')
let core = require('./core.js')
let util = require('./util.js')

const DEFAULT_WEB_CONFIG = {
  'mongoUrl': '',
  'staticPath': util.addTrailingSlash(process.cwd()) + 'public',
  'faviconPath': util.addTrailingSlash(process.cwd()) + 'public/favicon.ico',
  'viewPath': util.addTrailingSlash(process.cwd()) + 'views',
  'defaultTemplate': null,
  'errorTemplate': null,
  'sessionSecret': 'dbbd821f0f40735ca5c2e03ad93bc79b',
  'sessionMaxAge': 600000,
  'sessionSaveUnitialized': true,
  'sessionResave': true,
  'startupHook': null, // Input: STATE. output: state
  'beforeRequestHook': null, // Input: STATE. output: state
  'afterRequestHook': null, // Input: STATE. output: state
  'routes': {}
}

const DEFAULT_REQUEST = {
  'query': {},
  'body': {},
  'baseUrl': {},
  'cookies': {},
  'session': {},
  'files': {},
  'params': [],
  'hostname': '',
  'method': 'get',
  'protocol': 'http',
  'url': ''
}

const DEFAULT_RESPONSE = {
  'response': '',
  'view': '',
  'session': {},
  'cookies': {},
  'status': 200,
  'errorMessage': ''
}

function createApp (webConfig) {
  let STATE = {}
  let WEB_CONFIG = util.patchObject(DEFAULT_WEB_CONFIG, webConfig)

  console.error('CONFIG : ' + util.getInspectedObject(WEB_CONFIG) + '\n')
  let app = addAppMiddleWare(express(), WEB_CONFIG)
  // inject WEB_CONFIG to app
  app.WEB_CONFIG = WEB_CONFIG
  // serve route
  app.all('/*', (request, response, next) => {
    // initiate state and newState processor
    STATE = composeWebState(WEB_CONFIG, request)
    // process
    async.series([
      // startupRequest
      createHookProcessor(WEB_CONFIG, 'startupHook', 'STARTUP HOOK', 'Unable to process startup hook'),
      // beforeRequest
      createHookProcessor(WEB_CONFIG, 'beforeRequestHook', 'BEFORE REQUEST HOOK', 'Unable to process beforeRequest hook'),
      // process chain
      createChainProcessor(WEB_CONFIG),
      // afterRequest
      createHookProcessor(WEB_CONFIG, 'afterRequestHook', 'AFTER REQUEST HOOK', 'Unable to process afterRequest hook')
    ], (error, result) => {
      if (error) {
        console.error(error)
      }
      finalProcess(app, request, response)
    })
  })
  // show 404 if no response
  app.use(function (req, res, next) {
    res.status(404).send("Sorry can't find that!")
  })
  // again, put WEB_CONFIG
  return app

  function escapeRoute (str) {
    // hyphen should be translated literally
    str = str.replace(/-/g, '\\-')
    // dots should be translated literally
    str = str.replace(/\./g, '\\.')
    return str
  }

  function buildRoutePattern (route) {
    // object (including regex pattern) should not be processed
    if (typeof route === 'string') {
      let str = escapeRoute(route)
      // translate into regex
      str = str.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '([a-zA-Z0-9_]*)')
      str = '^' + str + '$'
      let regex = new RegExp(str)
      return regex
    }
    return route
  }

  function extractParameterNames (route) {
    if (typeof route === 'string') {
      route = escapeRoute(route)
    }
    let matches = route.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
    if (matches === null) {
      matches = []
    }
    for (let i = 0; i < matches.length; i++) {
      matches[i] = matches[i].replace(':', '')
    }
    return matches
  }

  function isRouteMatch (route, url) {
    if (getRouteMatches(route, url)) {
      return true
    }
    return false
  }

  function getRouteMatches (route, url) {
    let routePattern = buildRoutePattern(route)
    return url.match(routePattern) || url.replace(/(.*)\/$/, '$1').match(routePattern)
  }

  function getParameters (route, url) {
    let routeMatches = getRouteMatches(route, url)
    let parameterNames = extractParameterNames(route)
    let parameters = {}
    for (let i = 0; i < parameterNames.length; i++) {
      let parameterName = parameterNames[i]
      parameters[parameterName] = routeMatches[i + 1]
    }
    return parameters
  }

  function addAppMiddleWare (app, WEB_CONFIG) {
    app.use(logger('dev'))
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(fileUpload())
    try {
      app.use(express.static(WEB_CONFIG.staticPath))
      app.use(favicon(WEB_CONFIG.faviconPath))
    } catch (error) {
    }
    try {
      app.set('views', WEB_CONFIG.viewPath)
    } catch (error) {
    }
    // pug, handlebars, and ejs are used altogether
    app.engine('pug', engines.pug)
    app.engine('handlebars', engines.handlebars)
    app.engine('ejs', engines.ejs)
    app.use(session({
      'secret': WEB_CONFIG.sessionSecret,
      'resave': WEB_CONFIG.sessionResave,
      'saveUninitialized': WEB_CONFIG.sessionSaveUnitialized,
      'cookie': {'maxAge': WEB_CONFIG.sessionMaxAge}
    }))
    return app
  }

  function packRequest (req) {
    let packedReq = {}
    for (let key in DEFAULT_REQUEST) {
      packedReq[key] = req[key]
    }
    return packedReq
  }

  function composeWebState (WEB_CONFIG, request) {
    let config = util.patchObject(DEFAULT_WEB_CONFIG, WEB_CONFIG)
    delete config['beforeRequestHook']
    delete config['afterRequestHook']
    delete config['startupHook']
    return {
      'config': config,
      'request': packRequest(request),
      'response': util.deepCopy(DEFAULT_RESPONSE)
    }
  }

  function logStateAndRunCallback (message, callback) {
    console.warn('\n\n[' + message.toUpperCase() + ']')
    console.warn('STATE : ' + JSON.stringify(STATE) + '\n\n')
    callback()
  }

  function createHookProcessor (WEB_CONFIG, hookKey, hookCaption, hookErrorMessage) {
    return function (callback) {
      let hook = WEB_CONFIG[hookKey]
      if (util.isRealObject(hook)) {
        // hook is object. Use it to patch current state
        let newState = hook
        STATE = util.patchObject(STATE, newState)
        logStateAndRunCallback(hookKey, callback)
      } else if (util.isString(hook)) {
        // hook is string, assume it as chain
        let chain = hook
        core.executeChain(chain, [STATE], function (error, newState) {
          if (!error) {
            STATE = util.patchObject(STATE, newState)
          } else {
            STATE.response.status = 500
            STATE.response.errorMessage = hookErrorMessage
            console.error(error)
          }
          logStateAndRunCallback(hookCaption, callback)
        })
      } else {
        // hook is neither object nor string. Pass on the current state
        callback()
      }
    }
  }

  function createChainProcessor (WEB_CONFIG) {
    return function (callback) {
      if (STATE.response.status >= 400 && STATE.response.status < 600) {
        callback()
      } else {
        let routeObjList = STATE.config.routes
        let url = STATE.request.url
        let found = false
        for (let i = 0; i < routeObjList.length; i++) {
          let routeObj = routeObjList[i]
          let method = routeObj.method
          let route = routeObj.route
          if ((method === 'all' || method === STATE.request.method) && isRouteMatch(route, url)) {
            let chain = routeObj.chain
            STATE.request.params = getParameters(route, url)
            found = true
            core.executeChain(chain, [STATE], function (error, newResponse) {
              if (!error) {
                STATE.response.status = 200
                STATE.response.errorMessage = ''
                if (!util.isRealObject(newResponse)) {
                  newResponse = {'response': String(newResponse)}
                }
                STATE.response = util.patchObject(STATE.response, newResponse)
                console.error(STATE.response)
              } else {
                STATE.response.status = 500
                STATE.response.errorMessage = 'Unable to process chain'
                console.error(error)
              }
              logStateAndRunCallback('PROCESS CHAIN', callback)
            })
            break
          }
        }
        if (!found) {
          STATE.response.status = 404
          STATE.response.errorMessage = 'Not Found'
          logStateAndRunCallback('PROCESS CHAIN', callback)
        }
      }
    }
  }

  function finalProcess (app, request, response) {
    let responseStatus = STATE.response.status
    let responseErrorMessage = STATE.response.errorMessage
    let cookies = STATE.response.cookies
    let session = STATE.response.session
    // save cookies
    for (let key in cookies) {
      if (key !== 'sessionid') {
        response.cookie(key, STATE.cookies[key])
      }
    }
    // save session
    for (let key in session) {
      if (key !== 'cookie') {
        request.session[key] = STATE.session[key]
      }
    }
    // render response
    request.session.save(function (error) {
      if (error) {
        if (!util.isNullOrUndefined(WEB_CONFIG.errorTemplate)) {
          // set locals, only providing error in development
          response.locals.message = responseStatus
          if (app.get('env') === 'development') {
            let err = new Error(responseErrorMessage)
            err.status = responseStatus
            response.locals.error = err
          } else {
            response.locals.error = {}
          }
          // render the error page
          response.status(responseStatus || 500)
          response.render(WEB_CONFIG.errorTemplate)
        } else {
          response.send(String(responseErrorMessage))
        }
      } else {
        if ('view' in STATE.response && STATE.response.view !== '') {
          response.render(STATE.response.view, STATE)
        } else {
          response.send(STATE.response.response)
        }
      }
    })
  }
}
