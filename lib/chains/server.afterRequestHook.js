'use strict'
require('cache-require-paths')

const core = require('../core.js')
const util = require('../util.js')

function processResponse (res) {
  if (!util.isRealObject(res)) {
    res = {'data': res}
  }
  res.success = 'success' in res ? res.success : false
  res.errorMessage = 'errorMessage' in res ? res.errorMessage : ''
  res.data = 'data' in res ? res.data : ''
  if ('status' in res && res.status >= 400 && res.status < 600) {
    res.success = false
    res.data = {'data': res.data}
    res.data.success = false
    res.data.errorMessage = res.errorMessage
    res.status = 200
  }
  res.data = JSON.stringify(res.data)
  return res
}

module.exports = (ins, vars, callback) => {
  let webState = ins[0]
  let hook = webState.config.localAfterRequestHook
  let initCwd = vars._init_cwd
  if (hook) {
    return core.executeChain(initCwd + hook, [webState], (error, webState) => {
      webState.response = processResponse(webState.response)
      callback(error, webState)
    })
  }
  webState.response = processResponse(webState.response)
  return callback(null, webState)
}
