const web = require('chimera-framework/lib/web.js')
const jwt = require('jsonwebtoken')
const cck = require('./cck.js')
const port = process.env.PORT || 3000

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
  }
  try {
    if (token !== null) {
      req.auth = jwt.verify(token, webConfig.jwtSecret)
    } else {
      req.auth = {}
    }
  } catch (error) {
    console.error(error)
    req.auth = {}
  }
  next()
})

// define default value of webConfig.vars.$
if (!('vars' in webConfig)) {
  webConfig.vars = {}
}
if (!('$' in webConfig.vars)) {
  webConfig.vars.$ = {}
}

webConfig.vars.$.jwt = jwt
webConfig.vars.$.cck = cck

// define migrationCOnfig and cckDbConfig
webConfig.vars.$.migrationConfig = {
  mongoUrl: webConfig.mongoUrl,
  migrationPath: webConfig.migrationPath
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
