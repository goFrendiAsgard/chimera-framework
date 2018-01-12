module.exports = (ins, vars, callback) => {
  let cckState = ins[0]
  let $ = vars.$

  let collectionName = cckState.schema.collectionName
  let user = cckState.auth.id
  let limit = parseInt(cckState.limit)
  let skip = parseInt(cckState.offset)
  let showHistory = parseInt(cckState.showHistory)
  let excludeDeleted = parseInt(cckState.excludeDeleted)

  let dbConfig = {collectionName, dbOption: {excludeDeleted, showHistory, user}}
  let filter = $.cck.getCombinedFilter(cckState.filter, cckState.data)
  $.helper.mongoExecute(dbConfig, 'find', filter, {limit, skip}, (error, results) => {
    if (error) {
      return callback(error, null)
    }
    return $.helper.mongoExecute(dbConfig, 'count', filter, (error, count) => {
      cckState.result.metadata = {resultset: {count, limit, offset: skip}}
      if ($.util.isString(cckState.documentId)) {
        if (results.length > 0) {
          cckState.result.result = results[0]
        } else {
          cckState.result.result = {}
          cckState.result.status = 400
          cckState.result.userMessage = 'Data not found'
          cckState.result.developerMessage = 'Resource not found: Data does not exist or has been deleted, or query is wrong'
        }
      } else {
        cckState.result.results = results
      }
      return callback(error, cckState)
    })
  })
}
