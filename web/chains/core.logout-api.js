module.exports = (ins, vars, callback) => {
  let jsonwebtoken = require('jsonwebtoken')
  let state = ins[0]
  let $ = vars.$
  let jwtTokenName = state.config.jwtTokenName
  let jwtSecret = state.config.jwtSecret
  let auth = $.helper.getLoggedOutAuth()
  let jwtToken = jsonwebtoken.sign(auth, jwtSecret)

  // build response
  let cookies = {}
  cookies[jwtTokenName] = jwtToken
  let response = {
    cookies,
    data: {token: jwtToken, status: 200, userMessage: 'Logout success', developerMessage: 'Logout success'}
  }
  callback(null, response)
}
