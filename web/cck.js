'use strict'

const path = require('path')
const ejs = require('ejs')
const util = require('chimera-framework/lib/util.js')
const helper = require('./helper.js')

module.exports = {
  createSchema,
  removeSchema,
  getDefaultConfigs,
  getRoutes,
  getInitialState,
  getShownDocument,
  getCombinedFilter,
  renderFieldTemplate
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
  showHistory: 0,
  basePath: null,
  chainPath: null,
  viewPath: null
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
  insertActionView: '<%= viewPath %>cck/default.insertAction.ejs', // insert action
  updateActionView: '<%= viewPath %>cck/default.updateAction.ejs', // update action
  deleteActionView: '<%= viewPath %>cck/default.deleteAction.ejs', // delete action
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
  beforeSelectChain: null,
  afterSelectChain: null
}

const defaultFieldData = {
  caption: null,
  inputTemplate: '<%- cck.input.text %>',
  presentationTemplate: '<%- cck.presentation.text %>',
  defaultValue: '',
  options: {}
}

function renderFieldTemplate (schemaInfo, fieldName, templateNames, row) {
  let fieldInfo = schemaInfo.fields[fieldName]
  let realTemplateName
  if (util.isArray(templateNames)) {
    for (let templateName of templateNames) {
      if (templateName in fieldInfo && fieldInfo) {
        realTemplateName = templateName
        break
      }
    }
  } else {
    realTemplateName = templateNames
  }
  return ejs.render(fieldInfo[realTemplateName], {row, fieldName, fieldInfo, value: row[fieldName]})
}

function getSchemaCreationData (row) {
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

function removeSchema (config, callback) {
  let filterKeys = ['_id', 'name']
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

function getDefaultConfigs () {
  let webConfig = helper.getWebConfig()
  let basePath = webConfig.basePath
  let defaultConfigs = []
  for (let key in webConfig) {
    if (webConfig.exceptionKeys.indexOf(key) >= 0) {
      continue
    }
    let value = webConfig[key]
    let basePathPattern = new RegExp(basePath, 'g')
    if (util.isRealObject(value) || util.isArray(value)) {
      value = JSON.stringify(value)
      value = value.replace(basePathPattern, '<%- basePath %>')
      value = JSON.parse(value)
    } else if (util.isString(value)) {
      value = value.replace(basePathPattern, '<%- basePath %>')
    }
    defaultConfigs.push({key, value, defaultConfig: 1})
  }
  return defaultConfigs
}

function preprocessSchema (schema, config) {
  config = util.isNullOrUndefined(config) ? helper.getWebConfig() : config
  let completeSchema = util.getPatchedObject(defaultSchemaData, schema)
  // completing chiml path
  for (let key in completeSchema) {
    if (util.isString(completeSchema[key])) {
      completeSchema[key] = ejs.render(completeSchema[key], config)
    }
  }
  for (let field in completeSchema.fields) {
    let fieldData = util.getPatchedObject(defaultFieldData, completeSchema.fields[field])
    // define default caption
    fieldData.caption = util.isNullOrUndefined(fieldData.caption) ? field.charAt(0).toUpperCase() + field.slice(1) : fieldData.caption
    // completing chiml path
    for (let key in fieldData) {
      if (util.isString(fieldData[key])) {
        fieldData[key] = ejs.render(fieldData[key], config)
      }
    }
    completeSchema.fields[field] = fieldData
  }
  return completeSchema
}

function findSchema (filter, config, callback) {
  return helper.mongoExecute(cckCollectionName, 'find', filter, function (error, result) {
    if (error) {
      return callback(error, null)
    }
    let newResult = []
    for (let row of result) {
      newResult.push(preprocessSchema(row, config))
    }
    return callback(error, newResult)
  })
}

function getRoutes () {
  let webConfig = helper.getWebConfig()
  let chainPath = webConfig.chainPath
  return [
    {route: '/api/:version/:schemaName', method: 'get', chain: path.join(chainPath, 'cck/core.select.chiml')},
    {route: '/api/:version/:schemaName', method: 'post', chain: path.join(chainPath, 'cck/core.insert.chiml')},
    {route: '/api/:version/:schemaName', method: 'put', chain: path.join(chainPath, 'cck/core.update.chiml')},
    {route: '/api/:version/:schemaName', method: 'delete', chain: path.join(chainPath, 'cck/core.delete.chiml')},
    {route: '/api/:version/:schemaName/:id', method: 'get', chain: path.join(chainPath, 'cck/core.select.chiml')},
    {route: '/api/:version/:schemaName/:id', method: 'put', chain: path.join(chainPath, 'cck/core.update.chiml')},
    {route: '/api/:version/:schemaName/:id', method: 'delete', chain: path.join(chainPath, 'cck/core.delete.chiml')},
    {route: '/data/:schemaName', method: 'all', chain: path.join(chainPath, 'cck/core.show.chiml')},
    {route: '/data/:schemaName/insert', method: 'get', chain: path.join(chainPath, 'cck/core.insertForm.chiml')},
    {route: '/data/:schemaName/update/:id', method: 'get', chain: path.join(chainPath, 'cck/core.updateForm.chiml')},
    {route: '/data/:schemaName/insert', method: 'post', chain: path.join(chainPath, 'cck/core.insertAction.chiml')},
    {route: '/data/:schemaName/update/:id', method: 'post', chain: path.join(chainPath, 'cck/core.updateAction.chiml')},
    {route: '/data/:schemaName/delete/:id', method: 'all', chain: path.join(chainPath, 'cck/core.deleteAction.chiml')},
    {route: '/data/:schemaName/:id', method: 'all', chain: path.join(chainPath, 'cck/core.show.chiml')}
  ]
}

function getCombinedFilter (filter1, filter2) {
  let filter1KeyCount = Object.keys(filter1).length
  let filter2KeyCount = Object.keys(filter2).length
  if (filter1KeyCount === 0 && filter2KeyCount === 0) {
    return {}
  }
  if (filter1KeyCount === 0) {
    return filter2
  }
  if (filter2KeyCount === 0) {
    return filter1
  }
  return {$and: [filter1, filter2]}
}

function getQueryFilter (request) {
  let queryFilter = helper.getObjectFromJson(request.query._q)
  if ('_q' in request.body) {
    let bodyFilter = request.body._q
    if (util.isString(bodyFilter)) {
      try {
        bodyFilter = JSON.parse(bodyFilter)
      } catch (error) {
        // do nothing
      }
    }
    queryFilter = getCombinedFilter(queryFilter, bodyFilter)
  }
  return queryFilter
}

function getInitialState (state, callback) {
  let config = state.config
  let request = state.request
  let basePath = config.basePath ? config.basePath : null
  let chainPath = config.chainPath ? config.chainPath : null
  let viewPath = config.viewPath ? config.viewPath : null
  let migrationPath = config.migrationPath
  let apiVersion = request.params.version ? request.params.version : null
  let schemaName = request.params.schemaName ? request.params.schemaName : null
  let documentId = request.params.id ? helper.getNormalizedDocId(request.params.id) : null
  let queryFilter = getQueryFilter(request)
  let auth = request.auth
  let limit = 'limit' in request.query ? request.query.limit : 1000
  let offset = 'offset' in request.query ? request.query.offset : 0
  let excludeDeleted = '_excludeDeleted' in request.query ? request.query._excludeDeleted : 1
  let showHistory = '_showHistory' in request.query ? request.query._showHistory : 0
  let authId = 'id' in request.auth ? request.auth.id : ''
  let filter = util.isNullOrUndefined(documentId) ? queryFilter : getCombinedFilter({_id: documentId}, queryFilter)
  auth.id = helper.getNormalizedDocId(authId)
  findSchema({name: schemaName}, config, (error, schemas) => {
    if (error) {
      return callback(error, null)
    }
    if (schemas.length === 0) {
      return callback(new Error('cckError: Undefined schema ' + schemaName), null)
    }
    let schema = getTrimmedObject(schemas[0])
    let fieldNames = Object.keys(schema.fields)
    let data = helper.getParsedNestedJson(getData(request, fieldNames))
    let initialState = {auth, documentId, apiVersion, schemaName, fieldNames, data, filter, limit, offset, excludeDeleted, showHistory, schema, basePath, chainPath, viewPath, migrationPath}
    initialState = util.getPatchedObject(defaultInitialState, initialState)
    return callback(error, initialState)
  })
}

function getTrimmedObject (obj) {
  obj = util.getDeepCopiedObject(obj)
  if (util.isRealObject(obj)) {
    for (let key in obj) {
      if (!obj[key]) {
        delete obj[key]
      } else {
        obj[key] = getTrimmedObject(obj[key])
      }
    }
  }
  return obj
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
