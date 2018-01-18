module.exports = (fieldNames) => {
  return (ins, vars, callback) => {
    let cckState = ins[0]
    let $ = vars.$
    let dbConfig = {collectionName: 'web_groups', dbOption: {excludeDeleted: 0, showHistory: 0}}
    $.helper.mongoExecute(dbConfig, 'find', {}, (error, groups) => {
      if (error) {
        return callback(error, cckState)
      }
      for (let fieldName of fieldNames) {
        for (let group of groups) {
          cckState.schema.fields[fieldName].options[group.name] = group.name
        }
      }
      return callback(null, cckState)
    })
  }
}
