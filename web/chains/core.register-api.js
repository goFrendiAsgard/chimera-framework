const path = require('path')

module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let $ = vars.$
  let request = state.request
  let data = {
    username: request.query.username || request.body.username,
    password: request.query.password || request.body.password,
    email: request.query.email || request.body.email
  }
  state.request.params = {version: 'v1', schemaName: 'users'}
  $.cck.getInitialState(state, (error, cckState) => {
    if (error) {
      let response = {
        data: {
          token: '',
          status: 400,
          userMessage: 'Registration failed',
          developerMessage: 'Registration failed: Fail to initiate CCK'
        }
      }
      return callback(error, response)
    }
    // override permission and data of cckState
    cckState.schema.insertGroups = []
    cckState.data = data
    let chainPath = path.join(__dirname, 'cck/core.insert.js')
    return $.runChain(chainPath, state, cckState, (error, apiResponse) => {
      if (error) {
        let response = {
          data: {
            token: '',
            status: 400,
            userMessage: 'Registration failed',
            developerMessage: 'Registration failed: Insert failed'
          }
        }
        return callback(error, response)
      }
      return callback(null, apiResponse)
    })
  })
}
