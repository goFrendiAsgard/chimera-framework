module.exports = (ins, vars, callback) => {
  let cckState = ins[0]
  let $ = vars.$

  let collectionName = cckState.schema.collectionName
  let user = cckState.auth.id
  let showHistory = parseInt(cckState.showHistory)
  let excludeDeleted = parseInt(cckState.excludeDeleted)

  let option = {}
  if ($.util.isNullOrUndefined(cckState.documentId)) {
    option = {multi: 1}
  }

  let dbConfig = {collectionName, dbOption: {excludeDeleted, showHistory, user}}
  let action = excludeDeleted ? 'softRemove' : 'remove'
  $.helper.mongoExecute(dbConfig, action, cckState.filter, option, (error, result) => {
    if (error) {
      return callback(error, null)
    }
    cckState.result.result = JSON.parse(JSON.stringify(result))
    return callback(error, cckState)
  })
}
