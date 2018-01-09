module.exports = (ins, vars, callback) => {
  let state = ins[0]
  if (state.response.status < 400) {
    return vars.$.helper.injectBaseLayout(state, callback)
  } else if (!state.response.view && vars.$.util.isRealObject(state.response.data) && Object.keys(state.response.data).length === 0) {
    state.response.data = {
      userMessage: state.response.errorMessage,
      developerMessage: state.response.errorMessage,
      status: state.response.status
    }
  }
  return callback(null, state)
}
