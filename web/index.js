'use strict'

const web = require('chimera-framework/lib/web.js')
const cck = require('./cck.js')
const helper = require('./helper.js')
const port = process.env.PORT || 3000

// load webConfig
let webConfig = helper.getWebConfig()

// define default middlewares
webConfig.middlewares = 'middlewares' in webConfig? webConfig.middlewares: []
webConfig.middlewares.unshift(helper.jwtMiddleware)

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
