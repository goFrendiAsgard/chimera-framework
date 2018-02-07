const path = require('path')

const unauthorizedResponse = {
  status: 401,
  data: {
    status: 401,
    developerMessage: 'Unauthorized action to the document',
    userMessage: 'Unauthorized action to the document'
  }
}

module.exports = (processor, rowRestrictionKey) => {
  return (ins, vars, callback) => {
    let state = ins[0]
    let $ = vars.$
    let response = state.response
    let chainPath = path.join(__dirname, 'core.select.js')
    $.cck.getInitialState(state, (error, cckState) => {
      if (error) {
        return callback(error, response)
      }
      // when selecting, make sure data is empty so that it will not affect the filter
      cckState.data = {}
      $.runChain(chainPath, state, cckState, (error, apiResponse) => {
        if (error) {
          return callback(error, response)
        }
        if (apiResponse.status >= 400) {
          return callback(error, apiResponse)
        }
        let data = apiResponse.data
        if ('result' in data) {
          if (data.result[rowRestrictionKey]) {
            return callback(error, unauthorizedResponse)
          }
        } else if ('results' in data) {
          for (let row in data.results) {
            if (row[rowRestrictionKey]) {
              return callback(error, unauthorizedResponse)
            }
          }
        }
        return processor(ins, vars, callback)
      })
    })
  }
}