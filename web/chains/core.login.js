const path = require('path')

module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let response = state.response
  let $ = vars.$
  let chainPath = path.join(__dirname, 'core.login-api.js')
  $.runChain(chainPath, state, (error, apiResponse) => {
    if (error) {
      return callback(error, response)
    }
    response.auth = apiResponse.auth
    response.data = apiResponse.data
    response.cookies = apiResponse.cookies
    return callback(null, response)
  })
}
