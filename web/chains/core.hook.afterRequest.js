module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let $ = vars.$
  if (state.response.status < 400) {
    // override request.auth (in case of user logged in/logged out)
    if ('auth' in state.response && state.response.auth) {
      state.request.auth = state.response.auth
    }
    return $.helper.injectBaseLayout(state, callback)
  } else if (!state.response.view && $.util.isRealObject(state.response.data) && Object.keys(state.response.data).length === 0) {
    state.response.data = {
      userMessage: state.response.errorMessage,
      developerMessage: state.response.errorMessage,
      status: state.response.status
    }
  }
  return callback(null, state)
}
