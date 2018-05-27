const requireOnce = require('./require-once.js')
let SCRIPT_CACHE = {}

module.exports = function safeEval (code, env, opts) {
  const vm = requireOnce('vm')
  const sandbox = env || {}
  let script
  if (code in SCRIPT_CACHE) {
    script = SCRIPT_CACHE[code]
  } else {
    script = new vm.Script('__SAFE_EVAL_RESULT = ' + code)
    SCRIPT_CACHE[code] = script
  }
  try {
    script.runInNewContext(sandbox, opts)
    return sandbox.__SAFE_EVAL_RESULT
  } catch (error) {
    return code
  }
}
