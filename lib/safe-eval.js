const requireOnce = require('./require-once.js')
const vm = requireOnce('vm')

module.exports = function safeEval (code, context, opts) {
  let sandbox = {__SAFE_EVAL_RESULT: {}}
  if (context) {
    sandbox = Object.assign(context, sandbox)
  }
  code = '__SAFE_EVAL_RESULT = (() => {return ' + code + '})()'
  vm.runInNewContext(code, sandbox, opts)
  return sandbox.__SAFE_EVAL_RESULT
}
