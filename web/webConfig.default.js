const path = require('path')

function preprocessRoutes (routes, chainCwd) {
  for (let i = 0; i < routes.length; i++) {
    routes[i].chain = chainCwd + routes[i].chain
  }
  return routes
}

const middlewares = []

const webConfig = {
  preprocessRoutes,
  middlewares,
  verbose: 0,
  mongoUrl: 'mongodb://localhost/chimera-web-app',
  startupHook: path.join(__dirname, 'chains/core.startup.chiml'),
  staticPath: path.join(__dirname, 'public'),
  faviconPath: path.join(__dirname, 'public/favicon.ico'),
  viewPath: path.join(__dirname, 'views'),
  migrationPath: path.join(__dirname, 'migrations'),
  errorTemplate: path.join(__dirname, 'views/error.ejs')
}

webConfig.migrationConfig = {
  migrationPath: webConfig.migrationPath,
  mongoUrl: webConfig.mongoUrl
}

module.exports = webConfig
