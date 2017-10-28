const util = require('../../util.js')
function processResponse (res, callback) {
  if (!util.isRealObject(res)) {
    res = {'data' : res}
  }
  res.success = 'success' in res? res.success: false
  res.errorMessage = 'errorMessage' in res? res.errorMessage: ''
  res.data = 'data' in res? res.data: ''
  if ('status' in res && res.status >= 400 && res.status < 600) {
    res.success = false
    res.data = {'data': res.data}
    res.data.success = false
    res.data.errorMessage = res.errorMessage
    res.status = 200
  }
  res.data = JSON.stringify(res.data)
  callback(null, res)
}

module.exports = processResponse
