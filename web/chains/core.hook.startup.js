module.exports = (ins, vars, callback) => {
  let state = ins[0]
  vars.$.helper.injectState(state, callback)
}
