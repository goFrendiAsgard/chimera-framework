const path = require('path')

module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let $ = vars.$
  let response = state.response
  $.cck.getInitialState(state, (error, cckState) => {
    if (error) {
      return callback(error, response)
    }
    response.view = cckState.schema.updateActionView
    let chainPath = path.join(__dirname, 'core.update.js')
    return $.runChain(chainPath, state, cckState, (error, apiResponse) => {
      if (error) {
        return callback(error, response)
      }
      response.data = apiResponse.data
      response.data.cckState = cckState
      response.partial = cckState.schema.partial
      return callback(null, response)
    })
  })
}
