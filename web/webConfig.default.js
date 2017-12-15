const path = require('path')

const webConfig = {
  // routes
  routes: [],
  // list of express middlewares function
  middlewares: [],
  // mongoUrl database
  mongoUrl: 'mongodb://localhost/chimera-web-app',
  // verbosity level
  verbose: 0,
  // automatically do migration to this version if lastVersion is false
  version: '0',
  // automatically do migration to the latest version
  lastVersion: true,
  // migration path
  migrationPath: path.join(__dirname, 'migrations'),
  // startup hook
  startupHook: path.join(__dirname, 'chains/core.startup.chiml'),
  // location of static resources
  staticPath: path.join(__dirname, 'public'),
  // favicon path
  faviconPath: path.join(__dirname, 'public/favicon.ico'),
  // location of view files
  viewPath: path.join(__dirname, 'views'),
  // error view tempalate
  errorTemplate: path.join(__dirname, 'views/error.ejs')
}

module.exports = webConfig
