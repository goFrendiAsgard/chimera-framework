#! /usr/bin/env node
'use strict'

module.exports = {
  createApp,
  isRouteMatch,
  getRouteMatches,
  getParametersAsObject
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

const COLOR_FG_YELLOW = '\x1b[33m'
const COLOR_RESET = '\x1b[0m'

const VERBOSE = 1
const VERY_VERBOSE = 2
const ULTRA_VERBOSE = 3

const DEFAULT_WEB_CONFIG = {
  'mongoUrl': '',
  'verbose': 0,
  'staticPath': process.cwd() + '/public',
  'faviconPath': process.cwd() + '/public/favicon.ico',
  'viewPath': process.cwd() + '/views',
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
  'data': '',
  'view': '',
  'session': {},
  'cookies': {},
  'status': 200,
  'errorMessage': ''
}

function getEscapedRouteKey (route) {
  // hyphen should be translated literally
  let str = route.replace(/-/g, '\\-')
  // dots should be translated literally
  str = str.replace(/\./g, '\\.')
  return str
}

function getRoutePattern (route) {
  // object (including regex pattern) should not be processed
  if (typeof route === 'string') {
    let str = getEscapedRouteKey(route)
    // translate into regex
    str = str.replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '([a-zA-Z0-9_]*)')
    str = '^' + str + '$'
    let regex = new RegExp(str)
    return regex
  }
  return route
}

function getParameterNames (route) {
  if (typeof route === 'string') {
    route = getEscapedRouteKey(route)
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
  return !!getRouteMatches(route, url)
}

function getRouteMatches (route, url) {
  let routePattern = getRoutePattern(route)
  return url.match(routePattern) || url.replace(/(.*)\/$/, '$1').match(routePattern)
}

function getParametersAsObject (route, url) {
  let routeMatches = getRouteMatches(route, url)
  let parameterNames = getParameterNames(route)
  let parameters = {}
  for (let i = 0; i < parameterNames.length; i++) {
    let parameterName = parameterNames[i]
    parameters[parameterName] = routeMatches[i + 1]
  }
  return parameters
}

function createApp (webConfig) {
  let STATE = {}
  let WEB_CONFIG = util.getPatchedObject(DEFAULT_WEB_CONFIG, webConfig)

  logMessage('CONFIG :\n' + util.getInspectedObject(WEB_CONFIG), VERBOSE)
  let app = getAppWithMiddleware(express(), WEB_CONFIG)
  // serve route
  app.all('/*', (request, response, next) => {
    // initiate state and newState processor
    STATE = getWebState(WEB_CONFIG, request)
    // process
    async.series([
      createHookProcessor(STATE.config, 'startupHook'),
      createHookProcessor(STATE.config, 'beforeRequestHook'),
      createChainProcessor(STATE.config),
      createHookProcessor(STATE.config, 'afterRequestHook')
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
  return app

  function logMessage (message, verbosity) {
    let configVerbosity = 'config' in STATE ? STATE.config.verbose : WEB_CONFIG.verbose
    if (verbosity > configVerbosity) {
      return null
    }
    let isoDate = (new Date()).toISOString()
    console.error(COLOR_FG_YELLOW + '[' + isoDate + '] ' + message + COLOR_RESET)
  }

  function getAppWithMiddleware (app, config) {
    app.use(logger('dev'))
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(cookieParser())
    app.use(fileUpload())
    try {
      app.use(express.static(config.staticPath))
      app.use(favicon(config.faviconPath))
    } catch (error) {
      console.error(error)
    }
    try {
      app.set('views', config.viewPath)
    } catch (error) {
      console.error(error)
    }
    // pug, handlebars, and ejs are used altogether
    app.engine('pug', engines.pug)
    app.engine('handlebars', engines.handlebars)
    app.engine('ejs', engines.ejs)
    app.use(session({
      'secret': config.sessionSecret,
      'resave': config.sessionResave,
      'saveUninitialized': config.sessionSaveUnitialized,
      'cookie': {'maxAge': config.sessionMaxAge}
    }))
    return app
  }

  function getPackedRequest (req) {
    let packedReq = {}
    for (let key in DEFAULT_REQUEST) {
      packedReq[key] = req[key]
    }
    return packedReq
  }

  function getWebState (config, request) {
    let webStateConfig = util.getPatchedObject(DEFAULT_WEB_CONFIG, config)
    return {
      'config': webStateConfig,
      'request': getPackedRequest(request),
      'response': util.getDeepCopiedObject(DEFAULT_RESPONSE)
    }
  }

  function logState (description, verbosity) {
    logMessage(description + ' STATE :\n' + util.getInspectedObject(STATE), verbosity)
  }

  function createHookProcessor (config, hookKey) {
    return function (callback) {
      let hook = config[hookKey]
      if (util.isRealObject(hook)) {
        // hook is object. Use it to patch current state
        let newState = hook
        logState('BEFORE ' + hookKey, ULTRA_VERBOSE)
        STATE = util.getPatchedObject(STATE, newState)
        logState('AFTER ' + hookKey, VERY_VERBOSE)
        return callback()
      } else if (util.isString(hook)) {
        // hook is string, assume it as chain
        let chain = hook
        logState('BEFORE ' + hookKey, ULTRA_VERBOSE)
        core.executeChain(chain, [STATE], {}, function (error, newState) {
          if (!error) {
            STATE = util.getPatchedObject(STATE, newState)
          } else {
            STATE.response.status = 500
            STATE.response.errorMessage = error.name
            console.error(error)
          }
          logState('AFTER ' + hookKey, VERY_VERBOSE)
          return callback()
        })
      } else {
        // hook is neither object nor string. Pass on the current state
        return callback()
      }
    }
  }

  function createChainProcessor (config) {
    return function (callback) {
      if (STATE.response.status >= 400 && STATE.response.status < 600) {
        return callback()
      }
      let routeObjList = STATE.config.routes
      let url = STATE.request.url
      let method = STATE.request.method.toLowerCase()
      logState('BEFORE ' + url, ULTRA_VERBOSE)
      for (let i = 0; i < routeObjList.length; i++) {
        let routeObj = routeObjList[i]
        let routeMethod = routeObj.method
        let route = routeObj.route
        if ((routeMethod === 'all' || routeMethod === method) && isRouteMatch(route, url)) {
          let chain = routeObj.chain
          STATE.request.params = getParametersAsObject(route, url)
          core.executeChain(chain, [STATE], {}, function (error, newResponse) {
            if (!error) {
              STATE.response.status = 200
              STATE.response.errorMessage = ''
              if (!util.isRealObject(newResponse)) {
                newResponse = {'data': String(newResponse)}
              }
              STATE.response = util.getPatchedObject(STATE.response, newResponse)
            } else {
              STATE.response.status = 500
              STATE.response.errorMessage = 'Unable to process chain'
              console.error(error)
            }
            logState(url + ' -> ' + chain, VERY_VERBOSE)
            return callback()
          })
          return null
        }
      }
      STATE.response.status = 404
      STATE.response.errorMessage = 'Not Found'
      logState(url, VERY_VERBOSE)
      return callback()
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
      if (error || (STATE.response.status >= 400 && STATE.response.status < 600)) {
        if (!util.isNullOrUndefined(STATE.config.errorTemplate)) {
          // set locals, only providing error in development
          response.locals.message = responseErrorMessage
          if (app.get('env') === 'development') {
            let err = new Error(responseErrorMessage)
            err.status = responseStatus
            response.locals.error = err
          } else {
            response.locals.error = {}
          }
          // render the error page
          response.status(responseStatus || 500)
          response.render(STATE.config.errorTemplate)
          return null
        }
        // send errorMessage
        response.send(String(responseErrorMessage))
        return null
      }
      if ('view' in STATE.response && STATE.response.view !== '') {
        response.render(STATE.response.view, STATE.response.data)
        return null
      }
      response.send(STATE.response.data)
    })
  }
}
