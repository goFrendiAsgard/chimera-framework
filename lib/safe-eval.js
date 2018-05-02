const requireOnce = require('./require-once.js')
const vm = requireOnce('vm')
const resultKey = '__SAFE_EVAL_RESULT'

module.exports = function safeEval (code, context, opts) {
  let sandbox = {}
  sandbox[resultKey] = {}
  code = resultKey + '=' + code
  if (context) {
    const keys = Object.keys(context)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      sandbox[key] = context[key]
    }
  }
  vm.runInNewContext(code, sandbox, opts)
  return sandbox[resultKey]
}
