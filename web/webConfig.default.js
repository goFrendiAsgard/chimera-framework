'use strict'

const path = require('path')

let basePath = path.join(__dirname, '/')
let chainPath = path.join(__dirname, 'chains') + '/'
let viewPath = path.join(__dirname, 'views') + '/'

const webConfig = {
  basePath,
  chainPath,
  cckPath: path.join(__dirname, 'cck.js'),
  helperPath: path.join(__dirname, 'helper.js'),
  exceptionKeys: ['basePath', 'chainPath', 'cckPath', 'helperPath', 'exceptionKeys', 'routes', 'jwtSecret', 'jwtExpired', 'jwtTokenName', 'sessionSecret', 'sessionMaxAge', 'sessionSaveUnitialized', 'sessionResave', 'startupHook', 'beforeRequestHook', 'afterRequestHook', 'middlewares', 'mongoUrl', 'migrationPath', 'staticPath', 'faviconPath', 'viewPath', 'errorTemplate', 'defaultTemplate', 'baseLayout', 'vars'],
  // routes
  routes: [],
  // jwt configuration
  jwtSecret: 'secret' + String(Math.round(Math.random() * 1000000000)) + 'jwt',
  jwtExpired: 60 * 60 * 24,
  jwtTokenName: 'token',
  // session configuration
  sessionSecret: 'secret' + String(Math.round(Math.random() * 1000000000)) + 'session',
  sessionMaxAge: 60 * 60 * 24,
  sessionSaveUnitialized: true,
  sessionResave: true,
  // hook configuration
  startupHook: path.join(chainPath, 'core.hook.startup.chiml'),
  beforeRequestHook: path.join(chainPath, 'core.hook.beforeRequest.chiml'),
  afterRequestHook: path.join(chainPath, 'core.hook.afterRequest.chiml'),
  // list of express middlewares function
  middlewares: [],
  // mongoUrl database
  mongoUrl: 'mongodb://localhost/chimera-web-app',
  // verbosity level
  verbose: 1,
  // migration path
  migrationPath: path.join(__dirname, 'migrations') + '/',
  // location of static resources
  staticPath: path.join(__dirname, 'public') + '/',
  // favicon path
  faviconPath: path.join(__dirname, 'public/favicon.ico'),
  // location of view files
  viewPath: viewPath,
  // error view tempalate
  errorTemplate: path.join(viewPath, 'default.error.ejs'),
  defaultTemplate: null,
  baseLayout: path.join(viewPath, 'default.layout.ejs')
}

module.exports = webConfig
