#! /usr/bin/env node
'use strict'

module.exports = {
  createApp,
  isRouteMatch,
  getRouteMatches,
  getParametersAsObject
}

const async = require('neo-async')
const stringify = require('json-stringify-safe')
const express = require('express')
const favicon = require('serve-favicon')
const logger = require('morgan')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const fileUpload = require('express-fileupload')
const engines = require('consolidate')
const url = require('url')
const core = require('./core.js')
const util = require('./util.js')

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

function isRouteMatch (route, urlPath) {
  return !!getRouteMatches(route, urlPath)
}

function getRouteMatches (route, urlPath) {
  let routePattern = getRoutePattern(route)
  return urlPath.match(routePattern) || urlPath.replace(/(.*)\/$/, '$1').match(routePattern)
}

function getParametersAsObject (route, urlPath) {
  let routeMatches = getRouteMatches(route, urlPath)
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
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(cookieParser())
    app.use(fileUpload())
    try {
      if (!util.isNullOrUndefined(config.staticPath)) {
        app.use(express.static(config.staticPath))
      }
      if (!util.isNullOrUndefined(config.faviconPath)) {
        app.use(favicon(config.faviconPath))
      }
    } catch (error) {
      console.error(error)
    }
    try {
      if (!util.isNullOrUndefined(config.viewPath)) {
        app.set('views', config.viewPath)
      }
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
      let urlPath = url.parse(STATE.request.url).pathname
      let method = STATE.request.method.toLowerCase()
      logState('BEFORE ' + urlPath, ULTRA_VERBOSE)
      for (let i = 0; i < routeObjList.length; i++) {
        let routeObj = routeObjList[i]
        let routeMethod = routeObj.method
        let route = routeObj.route
        if ((routeMethod === 'all' || routeMethod === method) && isRouteMatch(route, urlPath)) {
          let chain = routeObj.chain
          STATE.request.params = getParametersAsObject(route, urlPath)
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
            logState(urlPath + ' -> ' + chain, VERY_VERBOSE)
            return callback()
          })
          return null
        }
      }
      STATE.response.status = 404
      STATE.response.errorMessage = 'Not Found'
      logState(urlPath, VERY_VERBOSE)
      return callback()
    }
  }

  function buildCookieResponse (response) {
    let cookies = STATE.response.cookies
    for (let key in cookies) {
      if (key !== 'sessionid') {
        response.cookie(key, STATE.response.cookies[key])
      }
    }
    return response
  }

  function buildSessionRequest (request, response) {
    let session = STATE.response.session
    for (let key in session) {
      if (key !== 'cookie') {
        request.session[key] = STATE.response.session[key]
      }
    }
    return request
  }

  function finalProcess (app, request, response) {
    let responseStatus = STATE.response.status
    let responseErrorMessage = STATE.response.errorMessage
    response = buildCookieResponse(response)
    request = buildSessionRequest(request, response)
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
          return response.render(STATE.config.errorTemplate)
        }
        // send errorMessage
        return response.send(String(responseErrorMessage))
      }
      if ('view' in STATE.response && STATE.response.view !== '') {
        return response.render(STATE.response.view, STATE.response.data)
      }
      if (util.isRealObject(STATE.response.data) || util.isArray(STATE.response.data)) {
        return response.send(stringify(STATE.response.data))
      }
      return response.send(String(STATE.response.data))
    })
  }
}
