const path = require('path')
const web = require(path.join(__dirname, '../../lib/web.js'))
const port = process.env.PORT || 3000

const webConfig = {
  'startupHook': path.join(__dirname, 'chains/hook-startup.chiml'),
  'verbose': 3
}
let app = web.createApp(webConfig)
module.exports = app

if (require.main === module) {
  app.listen(port, function () {
    console.error('Start at port ' + port)
  })
}
