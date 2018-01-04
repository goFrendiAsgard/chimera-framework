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
  getWebConfig,
  jwtMiddleware,
  injectState,
  mongoExecute,
  getObjectFromJson,
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
  return ejs.render(content, data).trim()
}

function injectBaseLayout (state, callback) {
  let cck = require('./cck.js')
  state.response.data.render = cck.render
  if (!util.isRealObject(state.response) || util.isNullOrUndefined(state.response.view) || state.response.view === '') {
    return callback(null, state)
  }
  let responseData = state.response.data
  let templateFile = getAbsoluteFilePath(state.config.viewPath, state.response.view)
  let content = loadEjs(templateFile, responseData)
  let newResponseData = {content, partial: {}}
  let actions = []
  for (let partialName in state.config.partial) {
    actions.push((next) => {
      let partialPath = state.config.partial[partialName]
      newResponseData.partial[partialName] = loadEjs(partialPath, {responseData})
      next()
    })
  }
  return async.parallel(actions, (error, result) => {
    state.response.data = newResponseData
    state.response.view = state.config.baseLayout
    return callback(error, state)
  })
}

function getAbsoluteFilePath (basePath, filePath) {
  if (path.isAbsolute(filePath)) {
    return filePath
  }
  return path.join(basePath, filePath)
}

function isAuthorized (request, groups) {
  if (groups.length === 0) {
    return true
  }
  if ('groups' in request.auth) {
    return hasIntersectionOrEquals(request.auth.groups, groups)
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
  mongo.execute(dbConfig, fn, ...args)
}

function injectState (state, callback) {
  let cck = require('./cck.js')
  let configDocs, routeDocs
  async.parallel([
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
  ], (error, result) => {
    // add db configs
    for (let doc of configDocs) {
      state.config[doc.key] = doc.value
    }
    // render routes
    for (let route in state.config.routes) {
      route = renderRoute(route, state.config)
    }
    // add rendered cck routes
    let cckRoutes = cck.getRoutes()
    for (let doc of cckRoutes) {
      state.config.routes.push(renderRoute(doc, state.config))
    }
    // add rendered db routes
    for (let doc of routeDocs) {
      state.config.routes.push(renderRoute(doc, state.config))
    }
    callback(error, state)
  })
}

function renderRoute (doc, config) {
  let route = ejs.render(doc.route, config)
  let method = doc.method ? ejs.render(doc.method, config) : 'all'
  let chain = ejs.render(doc.chain, config)
  return {route, method, chain}
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

function setCookieToken (webConfig, req, res) {
  req.auth = {}
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
