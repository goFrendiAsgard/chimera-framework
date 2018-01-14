const async = require('neo-async')

const unauthorizedResponse = {
  status: 401,
  data: {
    status: 401,
    developerMessage: 'Unauthorized',
    userMessage: 'Unauthorized'
  }
}

const validationErrorResponse = {
  status: 500,
  data: {
    status: 500,
    developerMessage: 'Validation checking failed',
    userMessage: 'Validation checking failed'
  }
}

const notUniqueResponse = {
  status: 400,
  data: {
    status: 400,
    developerMessage: 'Duplicate value, record might be exists. Make sure with _excludeDeleted=0 query request',
    userMessage: 'Duplicate value'
  }
}

function createNullResponse (fieldOption) {
  return {
    status: 400,
    data: {
      status: 400,
      developerMessage: fieldOption.caption + ' should not be null',
      userMessage: fieldOption.caption + ' should not be null'
    }
  }
}

function createInvalidRegexValidationResponse (fieldOption) {
  return {
    status: 400,
    data: {
      status: 400,
      developerMessage: fieldOption.regexValidationMessage,
      userMessage: fieldOption.regexValidationMessage
    }
  }
}

function mainProcess (state, cckState, $, chainNames, groupKey, callback) {
  // add `chainNames` to actions sequentially
  let actions = []
  for (let chainName of chainNames) {
    actions.push((next) => {
      if (cckState.result.status < 400 && cckState.schema[chainName]) {
        return $.runChain(cckState.schema[chainName], cckState, state, (error, newCckState) => {
          cckState = newCckState
          return next(error)
        })
      }
      return next()
    })
  }
  // run the actions and do the callback
  return async.series(actions, (error, result) => {
    let response = {
      error,
      cckState,
      status: (cckState && 'result' in cckState && 'status' in cckState.result) ? cckState.result.status : 500,
      data: (cckState && 'result' in cckState) ? cckState.result : {}
    }
    return callback(error, response)
  })
}

function checkAndContinueProcess (state, cckState, $, chainNames, groupKey, processFilter, callback) {
  // check authorization based on `groupKey`
  if (!$.helper.isAuthorized(state.request.auth, cckState.schema[groupKey])) {
    return callback(null, unauthorizedResponse)
  }
  // not processFilter, continue to mainProcess
  if (!processFilter) {
    return mainProcess(state, cckState, $, chainNames, groupKey, callback)
  }
  // processFilter
  let uniqueFilter = []
  for (let fieldName in cckState.schema.fields) {
    let fieldOption = cckState.schema.fields[fieldName]
    let nullResponse = createNullResponse(fieldOption)
    let invalidRegexValidationResponse = createInvalidRegexValidationResponse(fieldOption)
    let regexValidation = new RegExp(fieldOption.regexValidation)
    // check null field
    if (fieldOption.notNull) {
      if ($.util.isRealObject(cckState.data) && $.util.isNullOrUndefined(cckState.data[fieldName])) {
        return callback(null, nullResponse)
      } else if ($.util.isArray(cckState.data)) {
        for (let row of cckState.data) {
          if ($.util.isNullOrUndefined(row[fieldName])) {
            return callback(null, nullResponse)
          }
        }
      }
    }
    // check regex
    if (fieldOption.regexValidation) {
      // single insert or update
      if ($.util.isRealObject(cckState.data) && fieldName in cckState.data) {
        let str = $.util.isString(cckState.data[fieldName]) ? cckState.data[fieldName] : JSON.stringify(cckState.data[fieldName])
        if (!str.match(regexValidation)) {
          return callback(null, invalidRegexValidationResponse)
        }
      } else if ($.util.isArray(cckState.data)) {
        for (let row of cckState.data) {
          if (fieldName in row) {
            let str = $.util.isString(row[fieldName]) ? row[fieldName] : JSON.stringify(row[fieldName])
            if (!str.match(regexValidation)) {
              return callback(null, invalidRegexValidationResponse)
            }
          }
        }
      }
    }
    // add uniqueFilter
    if (fieldOption.unique) {
      // single insert or update
      if ($.util.isRealObject(cckState.data) && fieldName in cckState.data) {
        let newFilter = {}
        newFilter[fieldName] = cckState.data[fieldName]
        uniqueFilter.push(newFilter)
      } else if ($.util.isArray(cckState.data)) {
        for (let row of cckState.data) {
          if (fieldName in row) {
            let newFilter = {}
            newFilter[fieldName] = row[fieldName]
            uniqueFilter.push(newFilter)
          }
        }
      }
    }
  }
  // uniqueFilter doesn't exists, continue to mainProcess
  if (uniqueFilter.length === 0) {
    return mainProcess(state, cckState, $, chainNames, groupKey, callback)
  }
  // post-process uniqueFilter
  uniqueFilter = {$or: uniqueFilter}
  if (cckState.documentId) {
    uniqueFilter = {$and: [uniqueFilter, {_id: {$ne: cckState.documentId}}]}
  }
  // check Filter
  let collectionName = cckState.schema.collectionName
  let dbConfig = {collectionName, dbOption: {excludeDeleted: 0, showHistory: 0}}
  return $.helper.mongoExecute(dbConfig, 'find', uniqueFilter, (error, results) => {
    if (error) {
      // error while comparing to old data
      return callback(error, validationErrorResponse)
    } else if (results.length > 0) {
      // unique filter failed
      return callback(error, notUniqueResponse)
    }
    // filter checking success, continue to mainProcess
    return mainProcess(state, cckState, $, chainNames, groupKey, callback)
  })
}

module.exports = (chainNames, groupKey, processFilter) => {
  return (ins, vars, callback) => {
    let state = ins[0]
    let cckState = ins[1]
    let $ = vars.$
    if (!cckState) {
      return $.cck.getInitialState(state, (error, cckState) => {
        if (error) {
          let response = {data: {}}
          return callback(error, response)
        }
        return checkAndContinueProcess(state, cckState, $, chainNames, groupKey, processFilter, callback)
      })
    }
    return checkAndContinueProcess(state, cckState, $, chainNames, groupKey, processFilter, callback)
  }
}
