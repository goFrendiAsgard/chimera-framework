'use strict'
require('cache-require-paths')

const core = require('../core.js')
module.exports = (ins, vars, callback) => {
  let webState = ins[0]
  let hook = webState.config.localBeforeRequestHook
  let initCwd = vars._init_cwd
  if (hook) {
    return core.executeChain(initCwd + hook, [webState], callback)
  }
  return callback(null, webState)
}
