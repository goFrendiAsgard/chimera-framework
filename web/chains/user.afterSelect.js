function restrictDelete (user) {
  if (('_deleted' in user && user._deleted) || ('groups' in user && user.groups.indexOf('superAdmin') >= 0)) {
    user._restrictDelete = true
  }
  return user
}

module.exports = (ins, vars, callback) => {
  let cckState = ins[0]
  try {
    if ('results' in cckState.result) {
      for (let i=0; i<cckState.result.results.length; i++) {
        cckState.result.results[i] = restrictDelete(cckState.result.results[i])
      }
    } else if ('result' in cckState.result) {
      cckState.result = restrictDelete(cckState.result)
    }
    callback(null, cckState)
  } catch (error) {
    callback(error, cckState)
  }
}