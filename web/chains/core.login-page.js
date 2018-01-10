module.exports = (ins, vars, callback) => {
  let state = ins[0]
  let response = state.response
  return callback(null, response)
}
