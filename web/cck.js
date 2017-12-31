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
  getInitialState,
  getShownDocument,
  getCombinedFilter
}

const cckCollectionName = 'web_cck'

const defaultSavedSchemaData = {
  name: 'unnamed'
}

const defaultInitialState = {
  auth: {},
  documentId: null,
  schemaName: null,
  apiVersion: null,
  fieldNames: [],
  result: {
    status: 200,
    userMessage: '',
    developerMessage: ''
  },
  state: {},
  schema: {},
  filter: {},
  data: {},
  limit: 1000,
  offset: 0,
  excludeDeleted: 1,
  showHistory: 0
}

const defaultSchemaData = {
  name: 'unnamed',
  collectionName: 'unnamed',
  site: null,
  fields: {},
  insertChain: '<%= chainPath %>cck/default.insert.chiml', // insert api
  updateChain: '<%= chainPath %>cck/default.update.chiml', // update api
  deleteChain: '<%= chainPath %>cck/default.delete.chiml', // delete api
  selectChain: '<%= chainPath %>cck/default.select.chiml', // select api
  insertFormChain: '<%= chainPath %>cck/default.insertForm.chiml', // insert form
  updateFormChain: '<%= chainPath %>cck/default.updateForm.chiml', // update form
  showChain: '<%= chainPath %>cck/default.show.chiml', // show
  insertFormView: '<%= viewPath %>cck/default.insertForm.ejs', // insert form
  updateFormView: '<%= viewPath %>cck/default.updateForm.ejs', // update form
  showView: '<%= viewPath %>cck/default.show.ejs', // show
  showOneView: '<%= viewPath %>cck/default.showOne.ejs', // showOne
  insertGroups: [],
  updateGroups: [],
  deleteGroups: [],
  selectGroups: [],
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
  inputChain: '<%= chainPath %>cck/input.text.chiml',
  validationChain: '<%= chainPath %>cck/validation.all.chiml',
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
  let filterKeys = ['_id', 'name', 'site']
  let filter = {}
  if (util.isArray(config)) {
    let data = []
    for (let row of config) {
      data.push(helper.getSubObject(getSchemaCreationData(row), filterKeys))
    }
    filter = {$or: data}
  } else {
    filter = helper.getSubObject(getSchemaCreationData(config), filterKeys)
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
    'selectBulk': {route: '/api/:version/:schemaName',     method: 'get',    chain: path.join(chainPath, 'cck/core.select.chiml')},
    'insertBulk': {route: '/api/:version/:schemaName',     method: 'post',   chain: path.join(chainPath, 'cck/core.insert.chiml')},
    'updateBulk': {route: '/api/:version/:schemaName',     method: 'put',    chain: path.join(chainPath, 'cck/core.update.chiml')},
    'deleteBulk': {route: '/api/:version/:schemaName',     method: 'delete', chain: path.join(chainPath, 'cck/core.delete.chiml')},
    'selectOne':  {route: '/api/:version/:schemaName/:id', method: 'get',    chain: path.join(chainPath, 'cck/core.select.chiml')},
    'updateOne':  {route: '/api/:version/:schemaName/:id', method: 'put',    chain: path.join(chainPath, 'cck/core.update.chiml')},
    'deleteOne':  {route: '/api/:version/:schemaName/:id', method: 'delete', chain: path.join(chainPath, 'cck/core.delete.chiml')},
    'show':       {route: '/data/:schemaName',             method: 'all',    chain: path.join(chainPath, 'cck/core.show.chiml')},
    'showOne':    {route: '/data/:schemaName/:id',         method: 'all',    chain: path.join(chainPath, 'cck/core.show.chiml')},
    'insertForm': {route: '/data/:schemaName/insert',      method: 'all',    chain: path.join(chainPath, 'cck/core.insertForm.chiml')},
    'updateForm': {route: '/data/:schemaName/update/:id',  method: 'all',    chain: path.join(chainPath, 'cck/core.updateForm.chiml')}
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

function getCombinedFilter(filter1, filter2) {
  return {$and: [filter1, filter2]}
}

function getInitialState(state, callback) {
  let request = state.request
  let apiVersion = request.params.version? request.params.version: null
  let schemaName = request.params.schemaName? request.params.schemaName: null
  let documentId = request.params.id? helper.getNormalizedDocId(request.params.id): null
  let queryFilter = helper.getObjectFromJson(request.query._q)
  let auth = request.auth
  let limit = 'limit' in request.query? request.query.limit: 1000
  let offset = 'offset' in request.query? request.query.offset: 0
  let excludeDeleted = '_excludeDeleted' in request.query? request.query._excludeDeleted: 1
  let showHistory = '_showHistory' in request.query? request.query._showHistory: 0
  let authId = 'id' in request.auth? request.auth.id: ''
  let filter = util.isNullOrUndefined(documentId)? queryFilter: getCombinedFilter({_id:documentId}, queryFilter)
  auth.id = helper.getNormalizedDocId(authId)
  findSchema({name: schemaName}, (error, schemas) => {
    if (error) {
      return callback(error, null)
    }
    if (schemas.length == 0) {
      return callback(new Error('cckError: Undefined schema ' + schemaName), null)
    }
    let schema = schemas[0]
    let fieldNames = helper.getObjectKeys(schema.fields)
    let data = getData(request, fieldNames)
    let chainInput = {auth, documentId, apiVersion, schemaName, fieldNames, data, filter, limit, offset, excludeDeleted, showHistory, state, schema}
    chainInput = util.getPatchedObject(defaultInitialState, chainInput)
    return callback(error, chainInput)
  })
}

function getData (request, fieldNames) {
  if (util.isArray(request.body)) {
    let data = []
    for (let row of request.body) {
      data.push(helper.getSubObject(row, fieldNames))
    }
    return data
  }
  let queryData = helper.getSubObject(request.query, fieldNames)
  let bodyData = helper.getSubObject(request.body, fieldNames)
  let data = util.getPatchedObject(queryData, bodyData)
  return data
}

function getShownDocument (document, fieldNames) {
  let allowedFieldNames = util.getDeepCopiedObject(fieldNames)
  for (let field of ['_id', '_muser', '_mtime', '_deleted', '_history']) {
    if (allowedFieldNames.indexOf(field) < 0) {
      allowedFieldNames.push(field)
    }
  }
  if (util.isArray(document)) {
    let newDocument = []
    for (let row of document) {
      newDocument.push(getShownSingleDocument(row, allowedFieldNames))
    }
    return newDocument
  }
  return getShownSingleDocument(document, allowedFieldNames)
}

function getShownSingleDocument (row, allowedFieldNames) {
  let newRow = helper.getSubObject(row, allowedFieldNames)
  if ('_history' in newRow) {
    let newHistory = []
    for (let historyRow of newRow._history) {
      let newHistoryRow = {}
      for (let key in historyRow) {
        newHistoryRow[key] = getShownDocument(historyRow[key], allowedFieldNames)
      }
      newHistory.push(newHistoryRow)
    }
    newRow._history = newHistory
  }
  return newRow
}
