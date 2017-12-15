const path = require('path')
const middlewares = []
const mongoUrl = 'mongodb://localhost/chimera-web-app'
const migrationPath = path.join(__dirname, 'migrations')

const webConfig = {
  middlewares,
  mongoUrl,
  migrationPath,
  verbose: 0,
  startupHook: path.join(__dirname, 'chains/core.startup.chiml'),
  staticPath: path.join(__dirname, 'public'),
  faviconPath: path.join(__dirname, 'public/favicon.ico'),
  viewPath: path.join(__dirname, 'views'),
  errorTemplate: path.join(__dirname, 'views/error.ejs')
}

module.exports = webConfig
