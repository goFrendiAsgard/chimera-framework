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
      if (apiResponse.status < 400) {
        response.view = cckState.schema.updateFormView
        response.data = {
          cckState: $.util.getDeepCopiedObject(apiResponse.cckState),
          result: apiResponse.data.result
        }
        response.partial = cckState.schema.partial
      } else {
        response.status = apiResponse.status
        response.error = apiResponse.error
        response.errorMessage = apiResponse.data.userMessage
      }
      return callback(null, response)
    })
  })
}
