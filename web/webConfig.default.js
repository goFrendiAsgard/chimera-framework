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
  baseLayout: path.join(viewPath, 'default.layout.ejs'),
  partial: {
    scripts: path.join(viewPath, 'partials/default.scripts.ejs'),
    htmlHeader: path.join(viewPath, 'partials/default.htmlHeader.ejs'),
    leftWidget: path.join(viewPath, 'partials/default.leftWidget.ejs'),
    rightWidget: path.join(viewPath, 'partials/default.rightWidget.ejs'),
    largeBanner: path.join(viewPath, 'partials/default.largeBanner.ejs'),
    smallBanner: path.join(viewPath, 'partials/default.smallBanner.ejs'),
    largeFooter: path.join(viewPath, 'partials/default.largeFooter.ejs'),
    smallFooter: path.join(viewPath, 'partials/default.smallFooter.ejs')
  },
  cck: {
    // ejs to render inputs, parameters: fieldName, row, value, fieldInfo
    input: {
      text: '<input name="<%= fieldName %>" rowId="<%= row._id %>" class="form-control" type="text" value="<%= value %>" />',
      textArea: '<textarea name="<%= fieldName %>" rowId="<%= row._id %>" class="form-control"><%= value %></textarea>',
      jsonText: '<textarea name="<%= fieldName %>" rowId="<%= row._id %>" class="form-control cw-monospaced cw-textarea"><%= value === Object(value) ? JSON.stringify(value, null, 2) : value %></textarea>',
      codeText: '<textarea name="<%= fieldName %>" rowId="<%= row._id %>" class="form-control cw-monospaced cw-textarea"><%= value %></textarea>',
      option: '<select name="<%= fieldName %>" rowId="<%= row._id %>" class="form-control">\n' +
              '<% for (let value in fieldInfo.options){ %>\n' +
              '  <option value="<%= value %>" <%= value === fieldInfo.options[value]? "selected": ""%>><%= fieldInfo.options[value] %></option>\n' +
              '<% } %>\n' +
              '</select>'
    },
    // ejs to render presentations, parameters: fieldName, row, value, fieldInfo
    presentation: {
      text: '<%= value %>',
      option: '<%= value in fieldInfo.options? fieldInfo.options[value]: "" %>',
      trimmedText: '<%= value === null || value === undefined || value === \'\'? \'\': (JSON.stringify(value).length > 30 ? JSON.stringify(value).slice(0,27) + \'...\' : JSON.stringify(value)) %>',
      jsonText: '<pre><%= value === Object(value) ? JSON.stringify(value, null, 2) : value %></pre>',
      codeText: '<pre><%= value %></pre>'
    }
  }
}

module.exports = webConfig
