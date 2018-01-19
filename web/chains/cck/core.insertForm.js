let path = require('path')
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
    let chainPath = path.join(__dirname, 'core.select.js')
    return $.runChain(chainPath, state, cckState, (error, apiResponse) => {
      if (error) {
        return callback(error, response)
      }
      cckState = $.util.getDeepCopiedObject(apiResponse.cckState)
      response.view = cckState.schema.insertFormView
      response.data = {cckState}
      response.partial = cckState.schema.partial
      return callback(null, response)
    })
  })
}
