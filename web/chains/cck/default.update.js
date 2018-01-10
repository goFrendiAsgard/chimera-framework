module.exports = (ins, vars, callback) => {
  let cckState = ins[0]
  let $ = vars.$

  let collectionName = cckState.schema.collectionName
  let user = cckState.auth.id
  let showHistory = parseInt(cckState.showHistory)
  let excludeDeleted = parseInt(cckState.excludeDeleted)
  let data = cckState.data

  if (Object.keys(cckState.unset).length > 0) {
    data.$unset = cckState.unset
  }

  let options = $.util.isNullOrUndefined(cckState.documentId) ? {multi: 1} : {}

  let dbConfig = {collectionName, dbOption: {excludeDeleted, showHistory, user}}
  $.helper.mongoExecute(dbConfig, 'update', cckState.filter, data, options, (error, result) => {
    if (error) {
      return callback(error, null)
    }
    cckState.result.result = JSON.parse(JSON.stringify(result))
    return callback(error, cckState)
  })
}
