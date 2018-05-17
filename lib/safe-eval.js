const requireOnce = require('./require-once.js')

module.exports = function safeEval (code, context, opts) {
  const vm = requireOnce('vm')
  let sandbox = {__SAFE_EVAL_RESULT: {}}
  if (context) {
    sandbox = Object.assign(context, sandbox)
  }
  const wrappedCode = '__SAFE_EVAL_RESULT = ' + code
  vm.runInNewContext(wrappedCode, sandbox, opts)
  return sandbox.__SAFE_EVAL_RESULT
}
