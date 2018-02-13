'use strict'

const async = require('neo-async')
const path = require('path')
const ejs = require('ejs')
const fs = require('fs')
const util = require('chimera-framework/lib/util.js')
const helper = require('./helper.js')

module.exports = {
  createSchema,
  removeSchema,
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
  q: null,
  k: null,
  filter: {},
  unset: {},
  data: {},
  limit: 50,
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
  initChain: null,
  insertChain: '<%= chainPath %>cck/default.insert.js', // insert api
  updateChain: '<%= chainPath %>cck/default.update.js', // update api
  deleteChain: '<%= chainPath %>cck/default.delete.js', // delete api
  selectChain: '<%= chainPath %>cck/default.select.js', // select api
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
  let value = row[fieldName]
  return ejs.render(fieldInfo[realTemplateName], {row, fieldName, fieldInfo, value})
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

function getRealTemplateValue (template, config) {
  try {
    let value = ejs.render(template, config)
    if (fs.existsSync(value)) {
      value = fs.readFileSync(value, 'utf8')
    }
    return value
  } catch (error) {
    console.error(error)
    return ''
  }
}

function getCompleteSchemaFields (schemaFields, config) {
  for (let field in schemaFields) {
    let fieldData = util.getPatchedObject(defaultFieldData, schemaFields[field])
    // define default caption
    fieldData.caption = util.isNullOrUndefined(fieldData.caption) ? field.charAt(0).toUpperCase() + field.slice(1) : fieldData.caption
    // recursively complete fields key
    if ('fields' in fieldData && util.isRealObject(fieldData.fields)) {
      fieldData['fields'] = getCompleteSchemaFields(fieldData.fields, config)
    }
    // completing path
    for (let key in fieldData) {
      if (util.isString(fieldData[key])) {
        fieldData[key] = getRealTemplateValue(fieldData[key], config)
      }
    }
    schemaFields[field] = fieldData
  }
  return schemaFields
}

function preprocessSchema (schema, config) {
  schema = getTrimmedObject(schema)
  config = util.isNullOrUndefined(config) ? helper.getWebConfig() : config
  let completeSchema = util.getPatchedObject(defaultSchemaData, schema)
  // completing chiml path
  for (let key in completeSchema) {
    if (util.isString(completeSchema[key])) {
      completeSchema[key] = ejs.render(completeSchema[key], config)
    }
  }
  completeSchema.fields = getCompleteSchemaFields(completeSchema.fields, config)
  // automatically add renderTab key
  let tabRendered = false
  for (let fieldName in completeSchema.fields) {
    if (!tabRendered && 'tab' in completeSchema.fields[fieldName]) {
      completeSchema.fields[fieldName]['renderTab'] = true
      tabRendered = true
    }
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
    {route: '/api/:version/:schemaName', method: 'get', chain: path.join(chainPath, 'cck/core.select.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/api/:version/:schemaName', method: 'post', chain: path.join(chainPath, 'cck/core.insert.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/api/:version/:schemaName', method: 'put', chain: path.join(chainPath, 'cck/core.update.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/api/:version/:schemaName', method: 'delete', chain: path.join(chainPath, 'cck/core.delete.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/api/:version/:schemaName/:id', method: 'get', chain: path.join(chainPath, 'cck/core.select.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/api/:version/:schemaName/:id', method: 'put', chain: path.join(chainPath, 'cck/core.update.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/api/:version/:schemaName/:id', method: 'delete', chain: path.join(chainPath, 'cck/core.delete.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/data/:schemaName', method: 'all', chain: path.join(chainPath, 'cck/core.show.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/data/:schemaName/insert', method: 'get', chain: path.join(chainPath, 'cck/core.insertForm.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/data/:schemaName/update/:id', method: 'get', chain: path.join(chainPath, 'cck/core.updateForm.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/data/:schemaName/insert', method: 'post', chain: path.join(chainPath, 'cck/core.insertAction.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/data/:schemaName/update/:id', method: 'post', chain: path.join(chainPath, 'cck/core.updateAction.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/data/:schemaName/delete/:id', method: 'all', chain: path.join(chainPath, 'cck/core.deleteAction.js'), groups: ['loggedIn', 'loggedOut']},
    {route: '/data/:schemaName/:id', method: 'all', chain: path.join(chainPath, 'cck/core.show.js'), groups: ['loggedIn', 'loggedOut']}
  ]
}

function getCombinedFilter (filter1, filter2) {
  if (!filter1) { filter1 = {} }
  if (!filter2) { filter2 = {} }
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

function getFromRequest (request, key, defaultValue = null) {
  if (key in request.query) {
    return request.query[key]
  }
  if (key in request.body) {
    return request.body[key]
  }
  return defaultValue
}

function getQ (request) {
  let q = getFromRequest(request, '_q')
  if (util.isRealObject(q) || util.isArray(q)) {
    return JSON.stringify(q)
  }
  return q
}

function getK (request) {
  return getFromRequest(request, '_k')
}

function getIncludeFieldInfo (request) {
  return getFromRequest(request, '_includeFieldInfo')
}

function getFilter (q, k, fieldNames, documentId) {
  let queryFilter = helper.getObjectFromJson(q)
  let keywordFilter = {}
  if (k) {
    keywordFilter = []
    for (let fieldName of fieldNames) {
      let singleFilter = {}
      singleFilter[fieldName] = {$regex: new RegExp(k), $options: 'i'}
      keywordFilter.push(singleFilter)
    }
    keywordFilter = {$or: keywordFilter}
  }
  let filter = getCombinedFilter(queryFilter, keywordFilter)
  if (documentId) {
    filter = getCombinedFilter({'_id': documentId}, filter)
  }
  return filter
}

function getInitialState (state, callback) {
  try {
    let {config, request} = state
    let basePath = config.basePath ? config.basePath : null
    let chainPath = config.chainPath ? config.chainPath : null
    let viewPath = config.viewPath ? config.viewPath : null
    let migrationPath = config.migrationPath
    let apiVersion = request.params.version ? request.params.version : null
    let schemaName = request.params.schemaName ? request.params.schemaName : null
    let documentId = request.params.id ? helper.getNormalizedDocId(request.params.id) : null
    let q = getQ(request)
    let k = getK(request)
    let includeFieldInfo = getIncludeFieldInfo(request)
    let auth = request.auth
    let limit = parseInt(getFromRequest(request, 'limit', 50))
    let offset = parseInt(getFromRequest(request, 'offset', 0))
    let excludeDeleted = parseInt(getFromRequest(request, '_excludeDeleted', 1))
    let showHistory = parseInt(getFromRequest(request, '_showHistory', 0))
    let authId = 'id' in request.auth ? request.auth.id : ''
    auth.id = helper.getNormalizedDocId(authId)
    // get schema and fieldNames from the database
    findSchema({name: schemaName}, config, (error, schemas) => {
      if (error) { return callback(error, null) }
      if (schemas.length === 0) { return callback(new Error('cckError: Undefined schema ' + schemaName), null) }
      let schema = getSchemaWithDeleted(schemas[0], config, excludeDeleted)
      let fieldNames = Object.keys(schema.fields)
      // preprocess the data (extracted from request.query, request.body, and request.files)
      return getData(request, fieldNames, config, (error, data) => {
        let unset = getUnset(data)
        let filter = getFilter(q, k, fieldNames, documentId)
        data = helper.getParsedNestedJson(data)
        let caption  = 'caption' in schema && schema.caption.trim() !== '' ? schema.caption : schema.name.charAt(0).toUpperCase() + schema.name.slice(1)
        // compose initialState
        let initialState = util.getPatchedObject(defaultInitialState, {auth, documentId, apiVersion, q, k, includeFieldInfo, caption, schemaName, fieldNames, data, unset, filter, limit, offset, excludeDeleted, showHistory, schema, basePath, chainPath, viewPath, migrationPath})
        return executeInitChain(initialState, state, error, callback)
      })
    })
  } catch (error) {
    callback(error, null)
  }
}

function getSchemaWithDeleted (schema, config, excludeDeleted) {
  if (excludeDeleted === 0) {
    let options = {0: 'Not Deleted', 1: 'Deleted'}
    let inputTemplate = getRealTemplateValue('<%- cck.input.option %>', config)
    let presentationTemplate = getRealTemplateValue('<%- cck.presentation.option %>', config)
    let caption = 'Deletion Status'
    if (fs.existsSync(inputTemplate)) {
      inputTemplate = fs.readFileSync(inputTemplate, 'utf8')
    }
    schema.fields['_deleted'] = util.getPatchedObject(defaultFieldData, {inputTemplate, presentationTemplate, options, caption})
  }
  return schema
}

function executeInitChain (initialState, state, error, callback) {
  if (initialState.schema.initChain) {
    return helper.runChain(initialState.schema.initChain, initialState, state, (error, newInitialState) => {
      callback(error, newInitialState)
    })
  }
  return callback(error, initialState)
}

function getUnset (data) {
  let unset = {}
  for (let key in data) {
    if (data[key] === '') {
      unset[key] = ''
      delete data[key]
    }
  }
  return unset
}

function getTrimmedObject (obj) {
  obj = util.getDeepCopiedObject(obj)
  if (util.isRealObject(obj)) {
    for (let key in obj) {
      try {
        if (!obj[key]) {
          delete obj[key]
        } else {
          obj[key] = getTrimmedObject(obj[key])
        }
      } catch (error) {
        // do nothing
      }
    }
  }
  return obj
}

function getFileName (fileName) {
  return Date.now() + fileName
}

function getUploadPath (config) {
  return path.join(config.staticPath, 'uploads') + '/'
}

function getPreprocessedSingleData (data, files, fieldNames, config) {
  let actions = []
  let uploadPath = getUploadPath(config)
  data = helper.getSubObject(data, fieldNames)
  data = helper.getParsedNestedJson(data)
  if (util.isRealObject(files)) {
    for (let key in files) {
      let file = files[key]
      let fileName = getFileName(file.name)
      let keyParts = key.split('.')
      let script = 'data'
      for (let keyPart of keyParts) {
        script += '[' + JSON.stringify(keyPart) + ']'
      }
      script += ' = ' + JSON.stringify('/uploads/' + fileName)
      try {
        eval(script)
        actions.push((next) => {
          file.mv(uploadPath + fileName, (error) => {
            next(error)
          })
        })
      } catch (error) {
        console.error(script)
        console.error(error)
      }
    }
  }
  return {data, actions}
}

function getSingleData (request, fieldNames, config, callback) {
  let uploadPath = getUploadPath(config)
  let rawData = util.getPatchedObject(request.query, request.body)
  let rawFiles = request.files
  let {data, actions} = getPreprocessedSingleData (rawData, rawFiles, fieldNames, config)
  return async.parallel(actions, (error, result) => {
    callback(error, data)
  })
}

function getMultipleData (request, fieldNames, config, callback) {
  let uploadPath = getUploadPath(config)
  let allData = []
  let allActions = []
  for (let i = 0; i < request.body.length; i++) {
    let rawData = request.body[i]
    let rawFiles = {}
    for (let fieldName in request.files) {
      if (util.isArray(request.files[fieldName]) && i < request.files[fieldName].length) {
        rawFiles[fieldName] = request.files[fieldName][i]
      }
    }
    let {data, actions} = getPreprocessedSingleData(rawData, rawFiles, fieldNames, config)
    allData.push(data)
    for (let action of actions) {
      allActions.push(action)
    }
  }
  return async.parallel(allActions, (error, result) => {
    callback(error, allData)
  })
}

function getData (request, fieldNames, config, callback) {
  if (util.isArray(request.body)) {
    return getMultipleData(request, fieldNames, config, callback)
  }
  return getSingleData(request, fieldNames, config, callback)
}

function getAllowedFieldNames (fieldNames) {
  let allowedFieldNames = util.getDeepCopiedObject(fieldNames)
  for (let field of ['_id', '_muser', '_mtime', '_deleted', '_history']) {
    if (allowedFieldNames.indexOf(field) < 0) {
      allowedFieldNames.push(field)
    }
  }
  return allowedFieldNames
}

function getShownDocument (document, fieldNames, callback) {
  let allowedFieldNames = getAllowedFieldNames(fieldNames)
  if (util.isArray(document)) {
    let actions = []
    let newDocument = []
    for (let i = 0; i < document.length; i++) {
      let row = document[i]
      actions.push((next) => {
        getShownSingleDocument(row, allowedFieldNames, (error, newRow) => {
          if (error) {
            return next(error)
          }
          newDocument[i] = newRow
          return next(null, newRow)
        })
      })
    }
    return async.parallel(actions, (error, result) => {
      return callback(error, newDocument)
    })
  }
  return getShownSingleDocument(document, allowedFieldNames, callback)
}

function getShownSingleDocument (row, allowedFieldNames, callback) {
  let newRow = helper.getSubObject(row, allowedFieldNames)
  return callback(null, newRow)
}
