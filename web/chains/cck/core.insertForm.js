module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let $ = vars.$
  let response = state.response
  $.cck.getInitialState(state, (error, cckState) => {
    if (error) {
      return callback(error, response)
    }
    if (!$.helper.isAuthorized(state.request.auth, cckState.schema.insertGroups)) {
      response.status = 401
      response.errorMessage = 'Unauthorized'
      return callback(null, response)
    }
    response.view = cckState.schema.insertFormView
    response.data = {cckState}
    response.partial = cckState.schema.partial
    return callback(null, response)
  })
}
