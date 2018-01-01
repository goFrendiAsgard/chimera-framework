'use strict'

const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const path = require('path')
const ejs = require('ejs')
const fs = require('fs')
const util = require('chimera-framework/lib/util.js')
const mongo = require('chimera-framework/lib/mongo.js')

module.exports = {
  hashPassword,
  getWebConfig,
  jwtMiddleware,
  getDbConfig,
  getDbRoutes,
  mongoExecute,
  getObjectFromJson,
  getNormalizedDocId,
  getIfDefined,
  getObjectKeys,
  getSubObject,
  getIntersection,
  hasIntersectionOrEquals,
  isAuthorized,
  getAbsoluteFilePath,
  injectBaseLayout
}

function injectBaseLayout(state) {
  if (!util.isRealObject(state.response) || state.response.view == '') {
    return state
  }
  let responseData = state.response.data
  let viewPath = getAbsoluteFilePath(state.config.viewPath, state.response.view)
  let viewContent = fs.readFileSync(viewPath, 'utf8')
  let content = ejs.render(viewContent, responseData)
  let newResponseData = {content, partial:{}}
  for (let partialName in state.config.partial) {
    let partialPath = state.config.partial[partialName]
    let partialContent = fs.readFileSync(partialPath, 'utf8')
    newResponseData.partial[partialName] = ejs.render(partialContent, {responseData})
  }
  state.response.data = newResponseData
  state.response.view = state.config.baseLayout
  return state
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

function getIntersection (array1, array2) {
  let intersection = []
  for (let element of array1) {
    if (array2.indexOf(element) > -1) {
      intersection.push(element)
    }
  }
  return intersection
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

function getObjectKeys (obj) {
  return Object.keys(obj)
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

function getIfDefined (obj, key, defaultValue) {
  // only two parameters: if obj is null, return key, otherwise return obj
  if (util.isNullOrUndefined(defaultValue)) {
    return util.isNullOrUndefined(obj)? key: obj
  }
  // three parameters: if key in obj, return obj[key], otherwise return defaultValue
  return (key in obj) && !util.isNullOrUndefined(obj[key])? obj[key]: defaultValue
}

function mongoExecute (collectionName, fn, ...args) {
  let webConfig = getWebConfig()
  let mongoUrl = webConfig.mongoUrl
  let dbConfig = util.isRealObject(collectionName)? collectionName: {mongoUrl, collectionName}
  if (!('mongoUrl' in dbConfig)) {
    dbConfig.mongoUrl = mongoUrl
  }
  mongo.execute(dbConfig, fn, ...args)
}

function getDbConfig(callback) {
  mongoExecute('web_configs', 'find', {}, (error, docs) => {
    let dbConfig = {}
    for (let doc of docs) {
      dbConfig[doc.key] = doc.value
    }
    callback(error, dbConfig)
  })
}

function getDbRoutes(config, callback) {
  mongoExecute('web_routes', 'find', {}, (error, docs) => {
    let dbRoutes = []
    for (let doc of docs) {
      let route = ejs.render(doc.route, config)
      let method = doc.method? ejs.render(doc.method, config): 'all'
      let chain = ejs.render(doc.chain, config)
      dbRoutes.push({route, method, chain})
    }
    callback(error, dbRoutes)
  })
}

function createRandomString (length = 16) {
  return crypto.randomBytes(Math.ceil(length/2))
    .toString('hex')
    .slice(0,length)
}

function hashPassword (password, salt = null, algorithm = 'sha512'){
  if (util.isNullOrUndefined(salt)) {
    salt = createRandomString(16)
  }
  let hmac = crypto.createHmac(algorithm, salt)
  hmac.update(password)
  let hashedPassword = hmac.digest('hex')
  return {salt, hashedPassword}
}

function setCookieToken(webConfig, req, res) {
  req.auth = {}
  if (req.cookies && req.cookies[webConfig.jwtTokenName]) {
    if (!res.cookies) { res.cookies = {}; }
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
