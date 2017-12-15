const web = require('chimera-framework/lib/web.js')
const mongo = require('chimera-framework/lib/mongo.js')
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

// define default value of webConfig.vars.$
if (!('vars' in webConfig)) {
  webConfig.vars = {}
}
if (!('$' in webConfig.vars)) {
  webConfig.vars.$ = {}
}

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
  return mongo.execute(webConfig.cckDbConfig, 'insert', config, callback)
}

webConfig.vars.$.updateSchema = (config, callback) => {
  let filter = {'name': config.name, 'site': config.site}
  return mongo.execute(webConfig.cckDbConfig, 'update', filter, config, callback)
}

webConfig.vars.$.removeSchema = (config, callback) => {
  return mongo.execute(webConfig.cckDbConfig, 'remove', config, callback)
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
