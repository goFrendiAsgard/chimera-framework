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
  'routes': {},
  'vars': {}
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

const FORBIDDEN_RESPONSE_KEY = ['domain', '_events', '_eventsCount', '_maxListeners', 'output', 'outputEncodings', 'outputCallbacks', 'outputSize', 'writable', '_last', 'upgrading', 'chunkedEncoding', 'shouldKeepAlive', 'useChunkedEncodingByDefault', 'sendDate', '_removedHeader', '_contentLength', '_hasBody', '_trailer', 'finished', '_headerSent', 'socket', 'connection', '_header', '_headers', '_headerNames', '_onPendingData', 'req', 'locals', '_startAt', '_startTime', 'writeHead', '__onFinished', 'end', 'app', 'status', 'links', 'send', 'json', 'jsonp', 'sendStatus', 'sendFile', 'sendfile', 'download', 'type', 'contentType', 'format', 'attachment', 'append', 'header', 'set', 'get', 'clearCookie', 'cookie', 'location', 'redirect', 'vary', 'render', '_finish', 'statusCode', 'statusMessage', 'assignSocket', 'detachSocket', 'writeContinue', '_implicitHeader', 'writeHeader', 'setTimeout', 'destroy', '_send', '_writeRaw', '_buffer', '_storeHeader', 'setHeader', 'getHeader', 'removeHeader', '_renderHeaders', 'headersSent', 'write', 'addTrailers', '_flush', '_flushOutput', 'flushHeaders', 'flush', 'pipe', 'setMaxListeners', 'getMaxListeners', 'emit', 'addListener', 'on', 'prependListener', 'once', 'prependOnceListener', 'removeListener', 'removeAllListeners', 'listeners', 'listenerCount', 'eventNames']

const FORBIDDEN_REQUEST_KEY = ['_readableState', 'readable', 'domain', '_events', '_eventsCount', '_maxListeners', 'socket', 'connection', 'httpVersionMajor', 'httpVersionMinor', 'httpVersion', 'complete', 'headers', 'rawHeaders', 'trailers', 'rawTrailers', 'upgrade', 'url', 'method', 'statusCode', 'statusMessage', 'client', '_consuming', '_dumped', 'next', 'baseUrl', 'originalUrl', '_parsedUrl', 'params', 'query', 'res', '_startAt', '_startTime', '_remoteAddress', 'body', 'secret', 'cookies', 'signedCookies', '_parsedOriginalUrl', 'sessionStore', 'sessionID', 'session', 'route', 'app', 'header', 'get', 'accepts', 'acceptsEncodings', 'acceptsEncoding', 'acceptsCharsets', 'acceptsCharset', 'acceptsLanguages', 'acceptsLanguage', 'range', 'param', 'is', 'protocol', 'secure', 'ip', 'ips', 'subdomains', 'path', 'hostname', 'host', 'fresh', 'stale', 'xhr', 'setTimeout', 'read', '_read', 'destroy', '_addHeaderLines', '_addHeaderLine', '_dump', 'push', 'unshift', 'isPaused', 'setEncoding', 'pipe', 'unpipe', 'on', 'addListener', 'resume', 'pause', 'wrap', 'setMaxListeners', 'getMaxListeners', 'emit', 'prependListener', 'once', 'prependOnceListener', 'removeListener', 'removeAllListeners', 'listeners', 'listenerCount', 'eventNames']

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
  // nunjucks, pug, handlebars, and ejs are used altogether
  app.engine('njk', engines.nunjucks)
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

function getPacked (originalObject, defaultObject, forbiddenKey) {
  let packed = {}
  for (let key in defaultObject) {
    packed[key] = defaultObject[key]
  }
  for (let key in originalObject) {
    if (key in defaultObject || forbiddenKey.indexOf(key) < 0) {
      packed[key] = originalObject[key]
    }
  }
  return packed
}

function getWebState (config, request, response) {
  let webStateConfig = util.getPatchedObject(DEFAULT_WEB_CONFIG, config)
  return {
    'config': webStateConfig,
    'request': getPacked(request, DEFAULT_REQUEST, FORBIDDEN_REQUEST_KEY),
    'response': getPacked(response, DEFAULT_RESPONSE, FORBIDDEN_RESPONSE_KEY)
  }
}

function createResponder (app, webConfig) {
  return (request, response, next) => {
    // initiate state and newState processor
    let STATE = getWebState(webConfig, request, response)
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

    function logMessage (message, verbosity) {
      let configVerbosity = 'config' in STATE ? STATE.config.verbose : webConfig.verbose
      if (verbosity > configVerbosity) {
        return null
      }
      let isoDate = (new Date()).toISOString()
      return console.error(COLOR_FG_YELLOW + '[' + isoDate + '] ' + message + COLOR_RESET)
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
          logState('BEFORE ' + hookKey, VERY_VERBOSE)
          STATE = util.getPatchedObject(STATE, newState)
          logState('AFTER ' + hookKey, VERBOSE)
          return callback()
        } else if (util.isString(hook)) {
          // hook is string, assume it as chain
          let chain = hook
          logState('BEFORE ' + hookKey, VERY_VERBOSE)
          return core.executeChain(chain, [STATE], config.vars, function (error, newState) {
            if (!error) {
              STATE = util.getPatchedObject(STATE, newState)
            } else {
              STATE.response.status = 500
              STATE.response.errorMessage = error.name
              console.error(error)
            }
            logState('AFTER ' + hookKey, VERBOSE)
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
        logState('BEFORE ' + urlPath, VERY_VERBOSE)
        for (let i = 0; i < routeObjList.length; i++) {
          let routeObj = routeObjList[i]
          let routeMethod = routeObj.method
          let route = routeObj.route
          if ((routeMethod === 'all' || routeMethod === method) && isRouteMatch(route, urlPath)) {
            let chain = routeObj.chain
            STATE.request.params = getParametersAsObject(route, urlPath)
            return core.executeChain(chain, [STATE], config.vars, function (error, newResponse) {
              if (!error) {
                STATE.response.status = 200
                STATE.response.errorMessage = ''
                if (!util.isRealObject(newResponse)) {
                  newResponse = {'data': String(newResponse)}
                }
                STATE.response = util.getPatchedObject(STATE.response, newResponse)
              } else {
                STATE.response.status = 500
                STATE.response.errorMessage = 'Internal Server Error'
                console.error(error)
              }
              logState(urlPath + ' -> ' + chain, VERBOSE)
              return callback()
            })
          }
        }
        STATE.response.status = 404
        STATE.response.errorMessage = 'Not Found'
        logState(urlPath, VERBOSE)
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
}

function createApp (webConfig, ...middlewares) {
  webConfig = util.getPatchedObject(DEFAULT_WEB_CONFIG, webConfig)
  let app = getAppWithMiddleware(express(), webConfig)
  for (let middleware of middlewares) {
    if (util.isFunction(middleware)) {
      app.use(middleware)
    } else if (util.isRealObject(middleware)) {
      for (let route in middleware) {
        app.use(route, middleware[route])
      }
    }
  }
  app.all('/*', createResponder(app, webConfig))
  app.use(function (req, res, next) {
    res.status(404).send('Sorry can\'t find that!')
  })
  return app
}
