const path = require('path')
const {install, uninstall} = require('../../plugin.js')

if (require.main === module) {
  const action = process.argv.length > 2 ? process.argv[2] : 'install'
  const pluginName = path.basename(__dirname)
  if (action === 'install') {
    install(pluginName)
  } else {
    uninstall(pluginName)
  }
}