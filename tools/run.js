#! /usr/bin/env node
'use strict'

require('cache-require-paths')
const core = require('../lib/core.js')

function normalizeOutputValue (result) {
  const util = require('../lib/util.js')
  if (util.isNullOrUndefined(result)) {
    result = ''
  } else if (util.isString(result)) {
    result = result.trim('\n')
  } else if (util.isArray(result) || util.isRealObject(result)) {
    const stringify = require('json-stringify-safe')
    result = stringify(result)
  }
  return result
}

if (require.main === module) {
  if (process.argv.length > 2) {
    // first argument of the program (start from 2) is chain name or json
    const parameter = process.argv[2]
    // second until last arguments are input of the first chain
    const argv = process.argv.slice(3)
    // execute Yaml
    core.executeChain(parameter, argv, (error, result) => {
      if (error) {
        return console.error(error)
      }
      return console.log(normalizeOutputValue(result))
    })
  } else {
    // show missing arguments warning
    console.error('Missing Arguments')
    console.error('USAGE:')
    console.error('* ' + process.argv[1] + ' [chain-file]')
    console.error('* ' + process.argv[1] + ' [yaml-formatted-chain]')
  }
}
