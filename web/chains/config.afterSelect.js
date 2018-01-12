let fs = require('fs')
let path = require('path')
module.exports = (ins, vars, callback) => {
  let cckState = ins[0]
  try {
    let state = ins[1]
    let config = state.config
    if (cckState.documentId) {
      let key = cckState.result.result.key

      // booleans
      if (['showLeftNav', 'showTopNav', 'showJumbotron'].indexOf(key) > -1) {
        cckState.schema.fields.value.inputTemplate = config.cck.input.option
        cckState.schema.fields.value.options = ['No', 'Yes']
      }

      // verbose
      if (['verbose'].indexOf(key) > -1) {
        cckState.schema.fields.value.inputTemplate = config.cck.input.option
        cckState.schema.fields.value.options = ['Not Verbose', 'Verbose', 'Very Verbose']
      }

      // bootstrapTheme
      if (['bootstrapTheme'].indexOf(key) > -1) {
        cckState.schema.fields.value.inputTemplate = config.cck.input.option
        cckState.schema.fields.value.options = {'': '[No Theme]'}
        fs.readdirSync(path.join(config.staticPath, 'css/themes')).forEach((fileName) => {
          if (fileName.substr(fileName.length - 8, 8) === '.min.css') {
            let key = fileName.substr(0, fileName.length - 8)
            cckState.schema.fields.value.options[key] = key[0].toUpperCase() + key.slice(1)
          }
        })
      }

      // json
      if (['navigation', 'partial', 'cck'].indexOf(key) > -1) {
        cckState.schema.fields.value.inputTemplate = config.cck.input.jsonText
      }
    }
    callback(null, cckState)
  } catch (error) {
    callback(error, cckState)
  }
}
