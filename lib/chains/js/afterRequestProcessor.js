function processResponse (res, callback) {
  let success = null
  let errorMessage = null
  let response = null
  // try to get the original data
  try {
    let obj = JSON.parse(res.data)
    success = ('success' in obj) ? obj.success : success
    errorMessage = ('errorMessage' in obj) ? obj.errorMessage : errorMessage
    response = ('response' in obj) ? obj.response : response
  } catch (error) {}
  // get success, errorMessage, and response
  success = success === null ? (res.status < 400 || res.status >= 600) : success
  errorMessage = errorMessage === null ? res.errorMessage : errorMessage
  response = response === null ? '' : response
  // pack them all
  res.data = JSON.stringify({'success': success, 'errorMessage': errorMessage, 'response': response})
  callback(null, res)
}

module.exports = processResponse
