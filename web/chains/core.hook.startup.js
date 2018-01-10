module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let $ = vars.$
  $.helper.injectState(state, callback)
}
