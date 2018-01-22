'use strict'

const async = require('neo-async')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const path = require('path')
const ejs = require('ejs')
const fs = require('fs')
const util = require('chimera-framework/lib/util.js')
const mongo = require('chimera-framework/lib/mongo.js')
const core = require('chimera-framework/lib/core.js')

module.exports = {
  hashPassword,
  getLoggedInAuth,
  getLoggedOutAuth,
  getWebConfig,
  jwtMiddleware,
  injectState,
  mongoExecute,
  getObjectFromJson,
  getParsedNestedJson,
  getNormalizedDocId,
  getSubObject,
  isAuthorized,
  injectBaseLayout,
  runChain,
  loadEjs
}

function runChain (chain, ...args) {
  let vars = {$: {runChain, helper: module.exports, cck: require('./cck.js')}}
  let callback = args.pop()
  core.executeChain(chain, args, vars, callback)
}

function loadEjs (fileName, data) {
  let content = fs.readFileSync(fileName, 'utf8')
  if (content.indexOf('<%') > -1) {
    return ejs.render(content, data).trim()
  }
  return content
}

function renderContent (responseData, view, viewPath) {
  if (fs.existsSync(view)) {
    return loadEjs(view, responseData)
  } else if (fs.existsSync(path.join(viewPath, view))) {
    return loadEjs(path.join(viewPath, view), responseData)
  } else {
    return ejs.render(view, responseData)
  }
}

function injectBaseLayout (state, callback) {
  let cck = require('./cck.js')
  let renderFieldTemplate = cck.renderFieldTemplate
  let render = ejs.render
  if (util.isRealObject(state.response.data)) {
    state.response.data.renderFieldTemplate = renderFieldTemplate
    state.response.data.render = render
    state.response.data.isAuthorized = isAuthorized
  }
  if (util.isNullOrUndefined(state.response.view) || state.response.view === '') {
    return callback(null, state)
  }
  let {response, config, request} = state
  let responseData = response.data
  let newResponseData
  let actions = []
  actions.push((next) => {
    let content = renderContent(responseData, state.response.view, state.config.viewPath)
    newResponseData = {content, partial: {}}
    next()
  })
  for (let partialName in state.config.partial) {
    actions.push((next) => {
      let partialPath
      if (util.isRealObject(state.response.partial) && state.response.partial[partialName]) {
        partialPath = ejs.render(state.response.partial[partialName], state.config)
      } else {
        partialPath = state.config.partial[partialName]
      }
      if (fs.existsSync(partialPath)) {
        newResponseData.partial[partialName] = loadEjs(partialPath, {request, response, renderFieldTemplate, render, config, isAuthorized})
      } else {
        newResponseData.partial[partialName] = ejs.render(partialPath, {request, response, renderFieldTemplate, render, config, isAuthorized})
      }
      next()
    })
  }
  return async.parallel(actions, (error, result) => {
    state.response.data = newResponseData
    state.response.view = state.config.baseLayout
    return callback(error, state)
  })
}

function isAuthorized (auth, groups) {
  if (util.isString(groups)) {
    groups = [groups]
  }
  if (util.isNullOrUndefined(groups) || groups.length === 0) {
    return true
  }
  if ('groups' in auth) {
    return hasIntersectionOrEquals(auth.groups, groups)
  }
  return false
}

function hasIntersectionOrEquals (array1, array2) {
  if (array1.length === 0 && array2.length === 0) {
    return true
  }
  for (let element of array1) {
    if (array2.indexOf(element) > -1) {
      return true
    }
  }
  return false
}

function getSubObject (obj, keys) {
  let newObj = {}
  if (util.isRealObject(obj)) {
    for (let key of keys) {
      if (key in obj) {
        newObj[key] = obj[key]
      }
    }
  }
  return newObj
}

function getObjectFromJson (jsonString) {
  try {
    return JSON.parse(jsonString)
  } catch (error) {
    return {}
  }
}

function getParsedNestedJson (obj) {
  if (util.isString(obj)) {
    try {
      obj = JSON.parse(obj)
    } catch (error) {
      // do nothing
    }
  }
  if (util.isRealObject(obj)) {
    for (let key in obj) {
      if (util.isString(obj[key])) {
        try {
          obj[key] = JSON.parse(obj[key])
        } catch (error) {
          // do nothing
        }
      } else {
        obj[key] = getParsedNestedJson(obj[key])
      }
    }
  }
  return obj
}

function getNormalizedDocId (docId) {
  if (util.isString(docId)) {
    if (docId.length === 24) {
      return docId
    }
    return util.getSlicedString(util.getStretchedString(docId, 24, '0'), 24)
  }
  return null
}

function mongoExecute (collectionName, fn, ...args) {
  let webConfig = getWebConfig()
  let mongoUrl = webConfig.mongoUrl
  let dbConfig = util.isRealObject(collectionName) ? collectionName : {mongoUrl, collectionName}
  if (!('mongoUrl' in dbConfig)) {
    dbConfig.mongoUrl = mongoUrl
  }
  dbConfig.verbose = webConfig.verbose
  mongo.execute(dbConfig, fn, ...args)
}

function injectState (state, callback) {
  let cck = require('./cck.js')
  let configDocs, routeDocs
  let dbActions = [
    (next) => {
      mongoExecute('web_configs', 'find', {}, (error, docs) => {
        configDocs = docs
        next(error, docs)
      })
    },
    (next) => {
      mongoExecute('web_routes', 'find', {}, (error, docs) => {
        routeDocs = docs
        next(error, docs)
      })
    }
  ]
  async.parallel(dbActions, (error, result) => {
    if (error) {
      return callback(error, state)
    }
    // render configuration from database
    let configActions = []
    for (let doc of configDocs) {
      if (state.config.exceptionKeys.indexOf(doc.key) === -1) {
        configActions.push((next) => {
          state.config[doc.key] = renderConfigValue(doc, state.config)
          next()
        })
      }
    }
    return async.parallel(configActions, (error, result) => {
      if (error) {
        return callback(error, state)
      }
      state.config.exceptionKeys = []
      state.config.middlewares = []
      state.config.vars = []
      let routeActions = []
      // render routes
      for (let route in state.config.routes) {
        routeActions.push((next) => {
          route = renderRoute(route, state.config)
          next()
        })
      }
      // add rendered cck routes
      let cckRoutes = cck.getRoutes()
      for (let doc of cckRoutes) {
        routeActions.push((next) => {
          state.config.routes.push(renderRoute(doc, state.config))
          next()
        })
      }
      // add rendered db routes
      for (let doc of routeDocs) {
        routeActions.push((next) => {
          state.config.routes.push(renderRoute(doc, state.config))
          next()
        })
      }
      return async.parallel(routeActions, (error, result) => {
        // sort routes. If route.method is 'all', it should be at the end, otherwise, sort by route.route
        state.config.routes.sort((a, b) => {
          let aAll = a.method === 'all' ? 1 : 0
          let bAll = b.method === 'all' ? 1 : 0
          return (b.route.length - a.route.length) + (aAll - bAll)
        })
        callback(error, state)
      })
    })
  })
}

function renderConfigValue (doc, webConfig) {
  let value = doc.value
  if (util.isRealObject(value) || util.isArray(value)) {
    let str = JSON.stringify(value)
    if (str.indexOf('<%') > -1) {
      value = ejs.render(str, webConfig)
      value = JSON.parse(value)
    }
  } else if (util.isString(value) && value.indexOf('<%') > -1) {
    value = ejs.render(value, webConfig)
  }
  return value
}

function renderRoute (doc, config) {
  let route = doc.route
  let method = doc.method ? doc.method : 'all'
  let chain = doc.chain && doc.chain.indexOf('<%') > -1 ? ejs.render(doc.chain, config) : doc.chain
  if (!chain) { chain = 'ins: state' }
  let groups = 'groups' in doc ? doc.groups : []
  let routeObj = {route, method, chain, groups}
  if (doc.view) {
    routeObj.view = doc.view
  }
  return routeObj
}

function createRandomString (length = 16) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length)
}

function hashPassword (password, salt = null, algorithm = 'sha512') {
  if (util.isNullOrUndefined(salt)) {
    salt = createRandomString(16)
  }
  let hmac = crypto.createHmac(algorithm, salt)
  hmac.update(password)
  let hashedPassword = hmac.digest('hex')
  return {salt, hashedPassword}
}

function getLoggedInAuth (userDoc) {
  let groupNames = util.getDeepCopiedObject(userDoc.groups)
  groupNames.push('loggedIn')
  return {
    id: userDoc._id,
    username: userDoc.username,
    email: userDoc.email,
    groups: groupNames
  }
}

function getLoggedOutAuth () {
  return {
    id: '000000000000000000000000',
    username: null,
    email: null,
    groups: ['loggedOut']
  }
}

function setCookieToken (webConfig, req, res) {
  req.auth = getLoggedOutAuth()
  if (req.cookies && req.cookies[webConfig.jwtTokenName]) {
    if (!res.cookies) { res.cookies = {} }
    res.cookies[webConfig.jwtTokenName] = jwt.sign({}, webConfig.jwtSecret)
  }
}

function jwtMiddleware (req, res, next) {
  let webConfig = getWebConfig()
  let token
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.query && req.query[webConfig.jwtTokenName]) {
    token = req.query[webConfig.jwtTokenName]
  } else if (req.cookies && req.cookies[webConfig.jwtTokenName]) {
    token = req.cookies[webConfig.jwtTokenName]
  }
  try {
    if (!util.isNullOrUndefined(token)) {
      req.auth = jwt.verify(token, webConfig.jwtSecret)
    } else {
      setCookieToken(webConfig, req, res)
    }
  } catch (error) {
    setCookieToken(webConfig, req, res)
  }
  next()
}

function getWebConfig () {
  let webConfig
  try {
    webConfig = require('./webConfig.js')
  } catch (error) {
    webConfig = require('./webConfig.default.js')
  }
  return webConfig
}
