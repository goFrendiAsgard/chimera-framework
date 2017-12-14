const path = require('path')
const mongo = require('chimera-framework/lib/mongo.js')
const cckCollection = '_cck'
const middlewares = []
const mongoUrl = 'mongodb://localhost/chimera-web-app'
const migrationPath = path.join(__dirname, 'migrations')
const migrationConfig = {
  mongoUrl,
  migrationPath: migrationPath
}
const cckDbConfig = {
  mongoUrl,
  collectionName: cckCollection
}

function createSchema (config, callback) {
  return mongo.execute(cckDbConfig, 'insert', config, callback)
}

function updateSchema (config, callback) {
  let filter = {'name': config.name, 'site': config.site}
  return mongo.execute(cckDbConfig, 'update', filter, config, callback)
}

function removeSchema (config, callback) {
  return mongo.execute(cckDbConfig, 'remove', config, callback)
}

function getPreprocessedRoutes (routes, chainCwd) {
  for (let i = 0; i < routes.length; i++) {
    routes[i].chain = chainCwd + routes[i].chain
  }
  return routes
}

const helper = {
  getPreprocessedRoutes,
  createSchema,
  updateSchema,
  removeSchema
}

const webConfig = {
  helper,
  middlewares,
  mongoUrl,
  migrationPath,
  migrationConfig,
  verbose: 0,
  startupHook: path.join(__dirname, 'chains/core.startup.chiml'),
  staticPath: path.join(__dirname, 'public'),
  faviconPath: path.join(__dirname, 'public/favicon.ico'),
  viewPath: path.join(__dirname, 'views'),
  errorTemplate: path.join(__dirname, 'views/error.ejs')
}

module.exports = webConfig
