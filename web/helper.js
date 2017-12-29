'use strict'

const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const util = require('chimera-framework/lib/util.js')
const mongo = require('chimera-framework/lib/mongo.js')
const ejs = require('ejs')

module.exports = {
  hashPassword,
  getWebConfig,
  jwtMiddleware,
  getDbConfig,
  getDbRoutes,
  mongoExecute
}

function mongoExecute (collectionName, fn, ...args) {
  let webConfig = getWebConfig()
  let mongoUrl = webConfig.mongoUrl
  mongo.execute({mongoUrl, collectionName}, fn, ...args)
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
