const util = require('chimera-framework/lib/util.js')
const mongo = require('chimera-framework/lib/mongo.js')

module.exports = {
  createSchema,
  removeSchema,
  findSchema
}

const defaultSavedScehmaData = {
  name: 'unnamed'
}

const defaultSchemaData = {
  name: 'unnamed',
  collectionName: 'unnamed',
  site: null,
  fields: {},
  insertChiml: 'cck.default.insert.chiml',
  updateChiml: 'cck.default.update.chiml',
  deleteChiml: 'cck.default.delete.chiml',
  selectChiml: 'cck.default.select.chiml',
  insertFormChiml: 'cck.default.insertForm.chiml',
  updateFormChiml: 'cck.default.updateForm.chiml',
  deleteFormChiml: 'cck.default.deleteForm.chiml',
  viewChiml: 'cck.default.view.chiml',
  beforeInsertChiml: null,
  afterInsertChiml: null,
  beforeUpdateChiml: null,
  afterUpdateChiml: null,
  beforeUpdateChiml: null,
  afterUpdateChiml: null,
  beforeRemoveChiml: null,
  afterRemoveChiml: null,
  afterSelectChiml: null
}

function getDbConfig (mongoUrl) {
  return {mongoUrl, collectionName: '_cck'}
}

function createSchema (mongoUrl, config, callback) {
  let dbConfig = getDbConfig(mongoUrl)
  let data = util.getPatchedObject(defaultSavedSchemaData, config)
  return mongo.execute(dbConfig, 'insert', data, callback)
}

function removeSchema (mongoUrl, config, callback) {
  let dbConfig = getDbConfig(mongoUrl)
  let filter = {}
  if ('_id' in config) {
    // remove by _id
    filter._id = config._id
  } else if ('name' in config || 'site' in config) {
    // remove by name or config, or both
    if ('name' in config) {
      filter.name = config.name
    }
    if ('site' in config) {
      filter.site = config.site
    }
  } else {
    filter = config
  }
  return mongo.execute(dbConfig, 'remove', filter, callback)
}

function preprocssSchema (schema) {
  return util.getPatchedObject(defaultSchemaData, schema)
}

function findSchema (mongoUrl, config, callback) {
  let dbConfig = getDbConfig(mongoUrl)
  return mongo.execute(dbConfig, 'find', config, function (error, result) {
    if (error) {
      return callback (error, null)
    }
    let newResult = []
    for (let row of result) {
      newResult = preprocessSchema(row)
    }
    return callback(error, newResult)
  })
}


