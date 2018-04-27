module.exports = (ins, vars, callback) => {
  let webState = ins[0]
  let hook = webState.config.localStartupHook
  let dollar = vars.$
  let initCwd = vars._init_cwd
  if (hook) {
    return dollar.runChain(initCwd + hook, webState, callback)
  }
  return callback(null, webState)
}
