module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let $ = vars.$
  if (state.matchedRoute && !$.helper.isAuthorized(state.request.auth, state.matchedRoute.groups)) {
    state.response.status = 401
    state.response.errorMessage = 'Unauthorized'
  }
  callback(null, state)
}
