module.exports = (ins, vars, callback) => {
  let cckState = ins[0]
  let $ = vars.$

  let collectionName = cckState.schema.collectionName
  let user = cckState.auth.id
  let showHistory = parseInt(cckState.showHistory)
  let excludeDeleted = parseInt(cckState.excludeDeleted)
  let data = cckState.data

  let dbConfig = {collectionName, dbOption: {excludeDeleted, showHistory, user}}
  $.helper.mongoExecute(dbConfig, 'insert', data, (error, results) => {
    if (error) {
      return callback(error, null)
    }
    return $.cck.getShownDocument(results, cckState.fieldNames, (error, results) => {
      cckState.result.status = 201
      if ($.util.isArray(results)) {
        cckState.result.results = results
      } else {
        cckState.result.result = results
      }
      return callback(error, cckState)
    })
  })
}
