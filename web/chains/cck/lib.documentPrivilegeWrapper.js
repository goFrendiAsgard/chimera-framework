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
    $.runChain(chainPath, ...ins, (error, apiResponse) => {
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
  }
}