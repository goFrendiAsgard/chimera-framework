const async = require('neo-async')

function mainProcess (state, cckState, $, chainNames, groupKey, callback) {
  // check authorization based on `groupKey`
  if (!$.helper.isAuthorized(state.request.auth, cckState.schema[groupKey])) {
    let response = {
      status: 401,
      data: {
        status: 401,
        developerMessage: 'Unauthorized',
        userMessage: 'Unauthorized'
      }
    }
    return callback(null, response)
  }
  // prepare actions to run `chainNames` sequentially
  let actions = []
  for (let chainName of chainNames) {
    actions.push((next) => {
      if (cckState.result.status < 400 && cckState.schema[chainName]) {
        return $.runChain(cckState.schema[chainName], cckState, (error, newCckState) => {
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
      status: cckState.result.status,
      data: cckState.result
    }
    return callback(error, response)
  })
}

module.exports = (chainNames, groupKey) => {
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
        return mainProcess(state, cckState, $, chainNames, groupKey, callback)
      })
    }
    return mainProcess(state, cckState, $, chainNames, groupKey, callback)
  }
}
