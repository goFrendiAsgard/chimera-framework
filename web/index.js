const path = require('path')
const web = require('chimera-framework/lib/web.js')
const port = process.env.PORT || 3000

const webConfig = {
  'startupHook': path.join(__dirname, 'chains/core.startup.chiml'),
  'verbose': 0
}
let app = web.createApp(webConfig)

module.exports = {app, migrate, registerCollection}

if (require.main === module) {
  app.listen(port, function () {
    console.error('Start at port ' + port)
  })
}
