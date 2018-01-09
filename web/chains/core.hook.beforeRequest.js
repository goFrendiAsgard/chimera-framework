module.exports = (ins, vars, callback) => {
  let state = ins[0]
  if (state.matchedRoute && !vars.$.helper.isAuthorized(state.request.auth, state.matchedRoute.groups)) {
    state.response.status = 401
    state.response.errorMessage = 'Unauthorized'
  }
  callback(null, state)
}
