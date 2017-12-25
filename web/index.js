const web = require('chimera-framework/lib/web.js')
const util = require('chimera-framework/lib/util.js')
const mongo = require('chimera-framework/lib/mongo.js')
const expressJwt = require('express-jwt')
const jwt = require('jsonwebtoken')

const port = process.env.PORT || 3000
const defaultSchemaData = {}

// load webConfig
let webConfig
try {
  console.warn('[INFO] Load webConfig.js')
  webConfig = require('./webConfig.js')
} catch (error) {
  console.warn('[WARNING] webConfig.js is not exist, load webConfig.default.js')
  webConfig = require('./webConfig.default.js')
}

// define default middlewares
if (!('middlewares' in webConfig)) {
  webConfig.middlewares = []
}
webConfig.middlewares.unshift((req, res, next) => {
  let token
  if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
    token = req.headers.authorization.split(' ')[1]
  } else if (req.query && req.query[webConfig.jwtTokenName]) {
    token = req.query[webConfig.jwtTokenName]
  } else if (req.cookies && req.cookies[webConfig.jwtTokenName]) {
    token = req.cookies[webConfig.jwtTokenName]
  } else {
    token = jwt.sign({}, webConfig.jwtSecret)
  }
  console.error(token)
  req.auth = jwt.verify(token, webConfig.jwtSecret)
  next()
})

// define default value of webConfig.vars.$
if (!('vars' in webConfig)) {
  webConfig.vars = {}
}
if (!('$' in webConfig.vars)) {
  webConfig.vars.$ = {}
}

webConfig.vars.jwt = jwt

// define migrationCOnfig and cckDbConfig
webConfig.vars.$.migrationConfig = {
  mongoUrl: webConfig.mongoUrl,
  migrationPath: webConfig.migrationPath
}
webConfig.vars.$.cckDbConfig = {
  mongoUrl: webConfig.mongoUrl,
  collectionName: '_cck'
}

webConfig.vars.$.createSchema = (config, callback) => {
  let data = util.getPatchedObject(defaultSchemaData, config)
  return mongo.execute(webConfig.cckDbConfig, 'insert', data, callback)
}

webConfig.vars.$.removeSchema = (config, callback) => {
  let filter = {}
  if ('_id' in config) {
    // remove by _id
    filter._id = config._id
  } else if ('name' in config || 'site' in config) {
    // remove by name or config, or both
    if ('name' in config) {
      filter.name = config.name
    }
    if ('site' in config) {
      filter.site = config.site
    }
  } else {
    filter = config
  }
  return mongo.execute(webConfig.cckDbConfig, 'remove', filter, callback)
}

webConfig.vars.$.getPreprocessedRoutes = (routes, chainCwd) => {
  for (let i = 0; i < routes.length; i++) {
    routes[i].chain = chainCwd + routes[i].chain
  }
  return routes
}

let app = web.createApp(webConfig, ...webConfig.middlewares)

module.exports = {app}

if (require.main === module) {
  app.listen(port, function () {
    console.error('Start at port ' + port)
  })
}
