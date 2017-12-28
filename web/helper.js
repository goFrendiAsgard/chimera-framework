const jwt = require('jsonwebtoken')
const util = require('chimera-framework/lib/util.js')

module.exports = {
  getWebConfig,
  jwtMiddleware
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
      req.auth = {}
      if (!res.cookies) { res.cookies = {}; }
      res.cookies[webConfig.jwtTokenName] = jwt.sign({}, webConfig.jwtSecret)
    }
  } catch (error) {
    console.error(error)
    if (req.cookies && req.cookies[webConfig.jwtTokenName]) {
      if (!res.cookies) { res.cookies = {}; }
      res.cookies[webConfig.jwtTokenName] = jwt.sign({}, webConfig.jwtSecret)
    }
    req.auth = {}
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
