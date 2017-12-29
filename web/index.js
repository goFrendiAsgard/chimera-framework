'use strict'

const core = require('chimera-framework/lib/core.js')
const web = require('chimera-framework/lib/web.js')
const cck = require('./cck.js')
const helper = require('./helper.js')
const port = process.env.PORT || 3000

// load webConfig
let webConfig = helper.getWebConfig()

// define default middlewares
webConfig.middlewares = 'middlewares' in webConfig? webConfig.middlewares: []
webConfig.middlewares.unshift(helper.jwtMiddleware)

// add `helper` and `cck` to webConfig.vars.$
webConfig.vars = 'vars' in webConfig? webConfig.vars: {}
webConfig.vars.$ = '$' in webConfig.vars? webConfig.vars.$: {}
webConfig.vars.$.helper = helper
webConfig.vars.$.cck = cck

// override webConfig.vars.$.runChain
function runChainAndCallback (...args) {
  let callback = args.pop()
  // get the chain
  let chain = args.shift()
  webConfig.vars.$.runChain = runChainAndCallback
  core.executeChain(chain, args, webConfig.vars, callback)
}
webConfig.vars.$.runChain = runChainAndCallback

// create app
let app = web.createApp(webConfig, ...webConfig.middlewares)

// export the app
module.exports = {app}

// run the server
if (require.main === module) {
  app.listen(port, function () {
    console.error('Start at port ' + port)
  })
}
