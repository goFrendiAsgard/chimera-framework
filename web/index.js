const web = require('chimera-framework/lib/web.js')
const port = process.env.PORT || 3000

let webConfig
try {
  console.warn('[INFO] Load webConfig.js')
  webConfig = require('./webConfig.js')
} catch (error) {
  console.warn('[WARNING] webConfig.js is not exist, load webConfig.default.js')
  webConfig = require('./webConfig.default.js')
}

let app = web.createApp(webConfig, ...webConfig.middlewares)

module.exports = {app}

if (require.main === module) {
  app.listen(port, function () {
    console.error('Start at port ' + port)
  })
}
