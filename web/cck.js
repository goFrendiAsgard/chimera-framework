'use strict'

const path = require('path')
const ejs = require('ejs')
const core = require('chimera-framework/lib/core.js')
const util = require('chimera-framework/lib/util.js')
const helper = require('./helper.js')

module.exports = {
  createSchema,
  removeSchema,
  findSchema,
  getRoute,
  getRoutes,
  getInitialState
}

const cckCollectionName = 'web_cck'

const defaultSavedSchemaData = {
  name: 'unnamed'
}

const defaultInitialState = {
  auth: {},
  documentId: null, // id of document
  apiVersion: null,
  result: {},
  state: {},
  schema: {}
}

const defaultSchemaData = {
  name: 'unnamed',
  collectionName: 'unnamed',
  site: null,
  fields: {},
  insertChain: '<%= chainPath %>cck.default.insert.chiml', // insert api
  updateChain: '<%= chainPath %>cck.default.update.chiml', // update api
  deleteChain: '<%= chainPath %>cck.default.delete.chiml', // delete api
  selectChain: '<%= chainPath %>cck.default.select.chiml', // select api
  insertFormChain: '<%= chainPath %>cck.default.insertForm.chiml', // insert form
  updateFormChain: '<%= chainPath %>cck.default.updateForm.chiml', // update form
  viewChain: '<%= chainPath %>cck.default.view.chiml', // view
  beforeInsertChain: null,
  afterInsertChain: null,
  beforeUpdateChain: null,
  afterUpdateChain: null,
  beforeRemoveChain: null,
  afterRemoveChain: null,
  afterSelectChain: null
}

const schemaChainList = ['insertChain', 'updateChain', 'deleteChain', 'selectChain', 'insertFormChain', 'updateFormChain', 'viewChain', 'beforeInsertChain', 'afterInsertChain', 'beforeUpdateChain', 'afterUpdateChain', 'beforeUpdateChain', 'afterUpdateChain', 'beforeRemoveChain', 'afterRemoveChain', 'afterSelectChain']

const defaultFieldData = {
  caption: null,
  inputChain: '<%= chainPath %>cck.input.text.chiml',
  validationChain: '<%= chainPath %>cck.validation.all.chiml',
  default: '',
  options: {}
}

const fieldChainList = ['inputChain', 'validationChain']

function getSchemaCreationData(row) {
  return util.getPatchedObject(defaultSavedSchemaData, row)
}

function createSchema (config, callback) {
  let data
  if (util.isArray(config)) {
    data = []
    for (let row of config) {
      data.push(getSchemaCreationData(row))
    }
  } else {
    data = getSchemaCreationData(data)
  }
  return helper.mongoExecute(cckCollectionName, 'insert', data, callback)
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
  return helper.mongoExecute(cckCollectionName, 'remove', filter, callback)
}

function preprocessSchema (schema) {
  let webConfig = helper.getWebConfig()
  // define completeSchema
  let completeSchema = util.getPatchedObject(defaultSchemaData, schema)
  // completing chiml path
  for (let key in completeSchema) {
    if (util.isString(completeSchema[key])) {
      completeSchema[key] = ejs.render(completeSchema[key], webConfig)
    }
  }
  for (let field in completeSchema.fields) {
    let fieldData = util.getPatchedObject(defaultFieldData, completeSchema.fields[field])
    // define default caption
    fieldData.caption = util.isNullOrUndefined(fieldData.caption)? field: fieldData.caption
    // completing chiml path
    for (let key of fieldChainList) {
      if (util.isString(fieldData[key])) {
        completeSchema.fields[field] = ejs.render(fieldData[key], webConfig)
      }
    }
    completeSchema.fields[field] = fieldData
  }
  return completeSchema
}

function findSchema (filter, callback) {
  return helper.mongoExecute(cckCollectionName, 'find', filter, function (error, result) {
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
  let route = {
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
    return route
  } else {
    return route[key]
  }
}

function getRoutes() {
  let webConfig = helper.getWebConfig()
  let chainPath = webConfig.chainPath
  let route = getRoute()
  let routes = []
  for (let key in route) {
    routes.push(route[key])
  }
  return routes
}

function getInitialState(state, callback) {
  let request = state.request
  let apiVersion = request.params.version? request.params.version: null
  let schemaName = request.params.schemaName? request.params.schemaName: null
  let documentId = request.params.id? request.params.id: null
  let auth = request.auth
  findSchema({name: schemaName}, (error, schemas) => {
    if (error) {
      return callback(error, null)
    }
    if (schemas.length == 0) {
      return callback(new Error('cckError: Undefined schema ' + schemaName), null)
    }
    let schema = schemas[0]
    let chainInput = {auth, documentId, apiVersion, state, schema}
    chainInput = util.getPatchedObject(defaultInitialState, chainInput)
    return callback(error, chainInput)
  })
}
