const path = require('path')

const webConfig = {
  // routes
  routes: [
    {route: '/', method: 'all', chain: 'index.chiml'},
    {route: '/login-api', method: 'all', chain: 'login-api.chiml'},
    {route: '/logout-api', method: 'all', chain: 'logout-api.chiml'}
  ],
  // jwt configuration
  jwtSecret: String(Math.round(Math.random() * 1000000000)),
  jwtExpired: 60 * 60 * 24,
  jwtTokenName: 'token',
  // session configuration
  sessionSecret: String(Math.round(Math.random() * 1000000000)),
  sessionMaxAge: 60 * 60 * 24,
  sessionSaveUnitialized: true,
  sessionResave: true,
  // hook configuration
  startupHook: path.join(__dirname, 'chains/core.startup.chiml'),
  beforeRequestHook: null,
  afterRequestHook: null,
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
  // location of static resources
  staticPath: path.join(__dirname, 'public'),
  // favicon path
  faviconPath: path.join(__dirname, 'public/favicon.ico'),
  // location of view files
  viewPath: path.join(__dirname, 'views'),
  // error view tempalate
  errorTemplate: path.join(__dirname, 'views/error.ejs'),
  defaultTemplate: null
}

module.exports = webConfig
