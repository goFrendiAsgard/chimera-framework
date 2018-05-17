'use strict'
require('cache-require-paths')

module.exports = {
  createApp,
  createServer,
  createWebSocket,
  isRouteMatch,
  getRouteMatches,
  getParametersAsObject
}

const nsync = require('neo-async')
const compression = require('compression')
const staticCache = require('express-static-cache')
const stringify = require('json-stringify-safe')
const express = require('express')
const favicon = require('serve-favicon')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const session = require('express-session')
const fileUpload = require('express-fileupload')
const engines = require('consolidate')
const url = require('url')
const http = require('http')
const socketIo = require('socket.io')
const core = require('./core.js')
const util = require('./util.js')

const COLOR_FG_YELLOW = '\x1b[33m'
const COLOR_RESET = '\x1b[0m'

const VERBOSE = 1
const VERY_VERBOSE = 2

const DEFAULT_WEB_CONFIG = {
  mongoUrl: '',
  verbose: 0,
  staticPath: process.cwd() + '/public',
  faviconPath: process.cwd() + '/public/favicon.ico',
  viewPath: process.cwd() + '/views',
  viewEngines: {
    ejs: 'ejs',
    pug: 'pug'
  },
  defaultTemplate: null,
  errorTemplate: null,
  sessionSecret: 'dbbd821f0f40735ca5c2e03ad93bc79b',
  sessionMaxAge: 600000,
  sessionSaveUnitialized: true,
  sessionResave: true,
  startupHook: null, // Input: STATE. output: state
  beforeRequestHook: null, // Input: STATE. output: state
  afterRequestHook: null, // Input: STATE. output: state
  routes: {},
  vars: {}
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
    const regex = new RegExp(str)
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
  const routePattern = getRoutePattern(route)
  return urlPath.match(routePattern) || urlPath.replace(/(.*)\/$/, '$1').match(routePattern)
}

function getParametersAsObject (route, urlPath) {
  const routeMatches = getRouteMatches(route, urlPath)
  const parameterNames = getParameterNames(route)
  let parameters = {}
  for (let i = 0; i < parameterNames.length; i++) {
    const parameterName = parameterNames[i]
    parameters[parameterName] = routeMatches[i + 1]
  }
  return parameters
}

function getAppWithMiddleware (app, config) {
  app.use(compression())
  try {
    if (!util.isNullOrUndefined(config.staticPath)) {
      app.use('/', express.static(config.staticPath))
      app.use(staticCache(config.staticPath, {
        maxAge: 'staticMaxAge' in config ? config.staticMaxAge : 365 * 24 * 60 * 60
      }))
    }
    if (!util.isNullOrUndefined(config.faviconPath)) {
      app.use(favicon(config.faviconPath))
    }
  } catch (error) {
    console.error(error)
  }
  try {
    if (!util.isNullOrUndefined(config.viewPath)) {
      app.set('view cache', true)
      app.set('views', config.viewPath)
    }
  } catch (error) {
    console.error(error)
  }
  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(cookieParser())
  app.use(fileUpload())
  // use view engines
  const extensions = Object.keys(config.viewEngines)
  for (let i = 0; i < extensions.length; i++) {
    const extension = extensions[i]
    const engine = engines[config.viewEngines[extension]]
    app.engine(extension, engine)
  }
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
  const defaultKeys = Object.keys(defaultObject)
  for (let i = 0; i < defaultKeys.length; i++) {
    const key = defaultKeys[i]
    packed[key] = defaultObject[key]
  }
  const originalKeys = Object.keys(originalObject)
  for (let i = 0; i < originalKeys.length; i++) {
    const key = originalKeys[i]
    if (key in defaultObject || forbiddenKey.indexOf(key) < 0) {
      packed[key] = originalObject[key]
    }
  }
  return packed
}

function getWebState (config, request, response) {
  const webStateConfig = util.getPatchedObject(DEFAULT_WEB_CONFIG, config)
  return {
    'config': webStateConfig,
    'request': getPacked(request, DEFAULT_REQUEST, FORBIDDEN_REQUEST_KEY),
    'response': getPacked(response, DEFAULT_RESPONSE, FORBIDDEN_RESPONSE_KEY)
  }
}

function createResponder (app, webConfig) {
  return (request, response) => {
    // initiate state and newState processor
    let STATE = getWebState(webConfig, request, response)
    // express's response status is a chainable function, and we want to use simple number instead
    STATE.response.status = 200
    // process
    nsync.series([
      createHookProcessor('startupHook'),
      routeProcessor, // set STATE.matchedRoute if there is a matching route, delete STATE.config.routes
      createHookProcessor('beforeRequestHook'),
      createChainProcessor(),
      createHookProcessor('afterRequestHook')
    ], (error) => {
      if (error) {
        console.error(error)
      }
      finalProcess(app, request, response)
    })

    function logMessage (message, verbosity) {
      const configVerbosity = 'config' in STATE ? STATE.config.verbose : webConfig.verbose
      if (verbosity > configVerbosity) {
        return null
      }
      const isoDate = (new Date()).toISOString()
      return console.error(COLOR_FG_YELLOW + '[' + isoDate + '] ' + message + COLOR_RESET)
    }

    function logState (description, verbosity) {
      const configVerbosity = 'config' in STATE ? STATE.config.verbose : webConfig.verbose
      if (verbosity > configVerbosity) {
        return null
      }
      logMessage(description + ' STATE :\n' + util.getInspectedObject(STATE), verbosity)
    }

    function findRouteObj (routeObjList, urlPath, method) {
      for (let i = 0; i < routeObjList.length; i++) {
        const routeObj = routeObjList[i]
        const routeMethod = routeObj.method
        const route = routeObj.route
        if ((routeMethod === 'all' || routeMethod === method) && isRouteMatch(route, urlPath)) {
          return routeObj
        }
      }
      return null
    }

    function routeProcessor (callback) {
      const routeObjList = STATE.config.routes
      const urlPath = url.parse(STATE.request.url).pathname
      const method = STATE.request.method.toLowerCase()
      logMessage('PROCESS ROUTE `' + urlPath + '`', VERBOSE)
      const routeObj = findRouteObj(routeObjList, urlPath, method)
      STATE.matchedRoute = routeObj
      if (util.isNullOrUndefined(routeObj)) {
        logMessage('CHAIN FOR `' + urlPath + '` DOES NOT EXIST', VERBOSE)
      } else {
        logMessage('FIND `' + routeObj.chain + '` FOR `' + urlPath + '`', VERBOSE)
      }
      delete STATE.config.routes
      callback()
    }

    function createHookProcessor (hookKey) {
      const config = STATE.config
      return function (callback) {
        const hook = config[hookKey]
        if (util.isRealObject(hook)) {
          // hook is object. Use it to patch current state
          const newState = hook
          logMessage('BEFORE ' + hookKey, VERBOSE)
          logState('BEFORE ' + hookKey, VERY_VERBOSE)
          STATE = util.getPatchedObject(STATE, newState)
          logMessage('AFTER ' + hookKey, VERBOSE)
          logState('AFTER ' + hookKey, VERY_VERBOSE)
          return callback()
        } else if (util.isString(hook)) {
          // hook is string, assume it as chain
          const chain = hook
          logMessage('BEFORE ' + hookKey, VERBOSE)
          logState('BEFORE ' + hookKey, VERY_VERBOSE)
          return core.executeChain(chain, [STATE], config.vars, function (error, newState) {
            if (!error) {
              STATE = util.getPatchedObject(STATE, newState)
            } else {
              STATE = util.getPatchedObject(STATE, newState)
              STATE.response.status = 500
              STATE.response.errorMessage = 'Internal Server Error'
              STATE.response.error = error
              console.error(error)
            }
            logMessage('AFTER ' + hookKey, VERBOSE)
            logState('AFTER ' + hookKey, VERY_VERBOSE)
            return callback()
          })
        } else {
          // hook is neither object nor string. Pass on the current state
          return callback()
        }
      }
    }

    function createChainProcessor () {
      const config = STATE.config
      return function (callback) {
        if (STATE.response.status >= 400) {
          return callback()
        }
        const routeObj = STATE.matchedRoute
        if (routeObj) {
          const urlPath = url.parse(STATE.request.url).pathname
          const route = routeObj.route
          if (routeObj.view) {
            // inject view if it is defined by the route
            STATE.response.view = routeObj.view
          }
          const chain = routeObj.chain
          STATE.request.params = getParametersAsObject(route, urlPath)
          logMessage('EXECUTE `' + chain + '`', VERBOSE)
          try {
            return core.executeChain(chain, [STATE], config.vars, function (error, newResponse) {
              if (!error) {
                if (!util.isRealObject(newResponse)) {
                  newResponse = {'data': String(newResponse)}
                }
                STATE.response = util.getPatchedObject(STATE.response, newResponse)
              } else {
                STATE.response = util.getPatchedObject(STATE.response, newResponse)
                STATE.response.status = 500
                STATE.response.errorMessage = 'Internal Server Error'
                STATE.response.error = error
                console.error(error)
              }
              logMessage('EXECUTION COMPLETE', VERBOSE)
              logState(chain, VERY_VERBOSE)
              return callback()
            })
          } catch (error) {
            STATE.response.status = 500
            STATE.response.errorMessage = 'Internal Server Error'
            STATE.response.error = error
            return callback()
          }
        }
        STATE.response.status = 404
        STATE.response.errorMessage = 'Not Found'
        logMessage('NOT FOUND', VERBOSE)
        return callback()
      }
    }

    function buildCookieResponse (response) {
      const cookies = STATE.response.cookies
      const keys = Object.keys(cookies)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        if (key !== 'sessionid') {
          response.cookie(key, STATE.response.cookies[key])
        }
      }
      return response
    }

    function buildSessionRequest (request) {
      const session = STATE.response.session
      const keys = Object.keys(session)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        if (key !== 'cookie') {
          request.session[key] = STATE.response.session[key]
        }
      }
      return request
    }

    function finalProcess (app, request, response) {
      response = buildCookieResponse(response)
      request = buildSessionRequest(request, response)
      // emit to all clients
      if ('server' in app && 'webSocket' in app.server && '_emit' in STATE.response) {
        try {
          const io = app.server.webSocket
          const emit = STATE.response._emit
          const rooms = 'rooms' in emit && util.isArray(emit.rooms) ? emit.rooms : []
          const event = 'event' in emit && util.isString(emit.event) ? emit.event : ''
          const args = 'args' in emit && util.isArray(emit.args) ? emit.args : []
          // prepare sockets
          let sockets = io.sockets
          for (let i = 0; i < rooms.length; i++) {
            sockets = sockets.to(rooms[i])
          }
          sockets.emit(event, ...args)
        } catch (error) {
          console.error(error)
        }
      }
      // render response
      request.session.save(function (error) {
        if (error) {
          console.error(error)
        }
        return renderResponse(app, response)
      })
    }

    function renderResponse (app, response) {
      const viewExists = (!util.isNullOrUndefined(STATE.response.view)) && (STATE.response.view !== '')
      response.set('X-XSS-Protection', 0)
      // standard render
      if (STATE.response.status < 400 && viewExists) {
        return response.render(STATE.response.view, STATE.response.data)
      }
      // JSON, without view
      if (!viewExists && ((util.isRealObject(STATE.response.data) || util.isArray(STATE.response.data)))) {
        return response.send(stringify(STATE.response.data))
      }
      // error
      if (STATE.response.status >= 400) {
        response.status(STATE.response.status || 500)
        response.locals.message = STATE.response.errorMessage
        response.locals.status = STATE.response.status
        if (app.get('env') === 'development') {
          if (STATE.response.error) {
            response.locals.error = STATE.response.error
          } else {
            let err = new Error(STATE.response.errorMessage)
            err.status = STATE.response.status
            response.locals.error = err
          }
        } else {
          response.locals.error = {}
        }
        if (!util.isNullOrUndefined(STATE.config.errorTemplate)) {
          return response.render(STATE.config.errorTemplate)
        }
        return response.send(String(STATE.response.errorMessage))
      }
      // JSON
      if (util.isRealObject(STATE.response.data) || util.isArray(STATE.response.data)) {
        return response.send(stringify(STATE.response.data))
      }
      // null or undefined
      if (util.isNullOrUndefined(STATE.response.data)) {
        return response.send('')
      }
      // everything else
      return response.send(String(STATE.response.data))
    }
  }
}

function createApp (webConfig, ...middlewares) {
  webConfig = util.getPatchedObject(DEFAULT_WEB_CONFIG, webConfig)
  // create app with default middlewares
  const app = getAppWithMiddleware(express(), webConfig)
  // add custom middlewares to the app
  for (let i = 0; i < middlewares.length; i++) {
    const middleware = middlewares[i]
    if (util.isFunction(middleware)) {
      app.use(middleware)
    } else if (util.isRealObject(middleware)) {
      const routes = Object.keys(middleware)
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i]
        app.use(route, middleware[route])
      }
    }
  }
  // add responder to the app
  const responder = createResponder(app, webConfig)
  app.all('/*', responder)
  app.use(function (req, res) {
    res.status(404).send('No responder found')
  })
  // add socketHandler
  if ('server' in app && 'webSocket' in app.server && 'socketHandler' in webConfig && util.isFunction(webConfig.socketHandler)) {
    app.server.webSocket.on('connection', (socket) => {
      webConfig.socketHandler(socket)
    })
  }
  return app
}

function createServer (app) {
  const server = http.Server(app)
  app.server = server
  return server
}

function createWebSocket (server) {
  const webSocket = socketIo(server)
  server.webSocket = webSocket
  return webSocket
}
