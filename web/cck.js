'use strict'

const path = require('path')
const core = require('chimera-framework/lib/core.js')
const util = require('chimera-framework/lib/util.js')
const mongo = require('chimera-framework/lib/mongo.js')
const helper = require('./helper.js')

module.exports = {
  createSchema,
  removeSchema,
  findSchema,
  mongoExecute,
  getRoute,
  getRouteList
}

const defaultSavedSchemaData = {
  name: 'unnamed'
}

const defaultChimlInput = {
  userId: null, // current user id
  id: null, // id of document
  data: null, // new data
  row: null, // document
  fieldName: null, // name of field
  value: null, // new value of field
  default: null, // default value of field
  options: {} // input's options
}

const defaultSchemaData = {
  name: 'unnamed',
  collectionName: 'unnamed',
  site: null,
  fields: {},
  insertChiml: 'cck.default.insert.chiml', // insert api
  updateChiml: 'cck.default.update.chiml', // update api
  deleteChiml: 'cck.default.delete.chiml', // delete api
  selectChiml: 'cck.default.select.chiml', // select api
  insertFormChiml: 'cck.default.insertForm.chiml', // insert form
  updateFormChiml: 'cck.default.updateForm.chiml', // update form
  viewChiml: 'cck.default.view.chiml', // view
  beforeInsertChiml: null,
  afterInsertChiml: null,
  beforeUpdateChiml: null,
  afterUpdateChiml: null,
  beforeRemoveChiml: null,
  afterRemoveChiml: null,
  afterSelectChiml: null
}

const schemaChimlList = ['insertChiml', 'updateChiml', 'deleteChiml', 'selectChiml', 'insertFormChiml', 'updateFormChiml', 'viewChiml', 'beforeInsertChiml', 'afterInsertChiml', 'beforeUpdateChiml', 'afterUpdateChiml', 'beforeUpdateChiml', 'afterUpdateChiml', 'beforeRemoveChiml', 'afterRemoveChiml', 'afterSelectChiml']

const defaultFieldData = {
  caption: null,
  inputChiml: 'cck.input.text.chiml',
  validationChiml: 'cck.validation.all.chiml',
  default: '',
  options: {}
}

const fieldChimlList = ['inputChiml', 'validationChiml']

function mongoExecute (collectionName, fn, ...args) {
  let webConfig = helper.getWebConfig()
  let mongoUrl = webConfig.mongoUrl
  mongo.execute({mongoUrl, collectionName}, fn, ...args)
}

function getCckDbConfig () {
  let webConfig = helper.getWebConfig()
  return {mongoUrl: webConfig.mongoUrl, collectionName: 'web_cck'}
}

function getSchemaCreationData(row) {
  return util.getPatchedObject(defaultSavedSchemaData, row)
}

function createSchema (config, callback) {
  let dbConfig = getCckDbConfig()
  let data
  if (util.isArray(config)) {
    data = []
    for (let row of config) {
      data.push(getSchemaCreationData(row))
    }
  } else {
    data = getSchemaCreationData(data)
  }
  return mongo.execute(dbConfig, 'insert', data, callback)
}

function getSchemaRemovalFilter(row) {
  let filter = {}
  if ('_id' in row) {
    // remove by _id
    filter._id = row._id
  } else if ('name' in row || 'site' in row) {
    // remove by name or row, or both
    if ('name' in row) {
      filter.name = row.name
    }
    if ('site' in row) {
      filter.site = row.site
    }
  } else {
    filter = row
  }
  return filter
}

function removeSchema (config, callback) {
  let dbConfig = getCckDbConfig()
  let filter = {}
  if (util.isArray(config)) {
    let data = []
    for (let row of config) {
      data.push(getSchemaCreationData(row))
    }
    filter = {$or: data}
  } else {
    filter = getSchemaCreationData(data)
  }
  return mongo.execute(dbConfig, 'remove', filter, callback)
}

function preprocessSchema (schema) {
  let webConfig = helper.getWebConfig()
  let chainPath = webConfig.chainPath
  // define completeSchema
  let completeSchema = util.getPatchedObject(defaultSchemaData, schema)
  // completing chiml path
  for (let key in schemaChimlList) {
    if (util.isNullOrUndefined(completeSchema[key])) {
      continue
    }
    completeSchema[key] = path.join(chainPath, completeSchema[key])
  }
  for (let key in completeSchema.fields) {
    let fieldData = util.getPatchedObject(defaultFieldData, completeSchema.fields[key])
    // define default caption
    if (util.isNullOrUndefined(fieldData.caption)) {
      fieldData.caption = key
    }
    // completing chiml path
    for (key of fieldChimlList) {
      if (util.isNullOrUndefined(fieldData[key])) {
        continue
      }
      completeSchema[key] = path.join(chainPath, fieldData[key])
    }
    completeSchema.fields[key] = fieldData
  }
  return completeSchema
}

function findSchema (config, callback) {
  let dbConfig = getCckDbConfig()
  return mongo.execute(dbConfig, 'find', config, function (error, result) {
    if (error) {
      return callback (error, null)
    }
    let newResult = []
    for (let row of result) {
      newResult.push(preprocessSchema(row))
    }
    return callback(error, newResult)
  })
}

function getRoute(key = null) {
  let webConfig = helper.getWebConfig()
  let chainPath = webConfig.chainPath
  let routes = {
    'selectBulk': {route: '/api/:version/:schemaName',     method: 'get',    chain: path.join(chainPath, 'cck.core.select.chiml')},
    'insertBulk': {route: '/api/:version/:schemaName',     method: 'post',   chain: path.join(chainPath, 'cck.core.insert.chiml')},
    'updateBulk': {route: '/api/:version/:schemaName',     method: 'put',    chain: path.join(chainPath, 'cck.core.update.chiml')},
    'deleteBulk': {route: '/api/:version/:schemaName',     method: 'delete', chain: path.join(chainPath, 'cck.core.delete.chiml')},
    'selectOne':  {route: '/api/:version/:schemaName/:id', method: 'get',    chain: path.join(chainPath, 'cck.core.select.chiml')},
    'updateOne':  {route: '/api/:version/:schemaName/:id', method: 'put',    chain: path.join(chainPath, 'cck.core.update.chiml')},
    'deleteOne':  {route: '/api/:version/:schemaName/:id', method: 'delete', chain: path.join(chainPath, 'cck.core.delete.chiml')},
    'view':       {route: '/data/:schemaName',             method: 'all',    chain: path.join(chainPath, 'cck.core.view.chiml')},
    'insertForm': {route: '/data/:schemaName/insert',      method: 'all',    chain: path.join(chainPath, 'cck.core.insertForm.chiml')},
    'updateForm': {route: '/data/:schemaName/update/:id',  method: 'all',    chain: path.join(chainPath, 'cck.core.updateForm.chiml')}
  }
  if (util.isNullOrUndefined(key)) {
    return routes
  } else {
    return routes[key]
  }
}

function getRouteList() {
  let webConfig = helper.getWebConfig()
  let chainPath = webConfig.chainPath
  let routes = getRoute()
  let routeList = []
  for (let key in routes) {
    routeList.push(routes[key])
  }
  return routeList
}
