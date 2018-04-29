#! /usr/bin/env node
'use strict'

require('cache-require-paths')
const core = require('../lib/core.js')

if (require.main === module) {
  if (process.argv.length > 2) {
    // first argument of the program (start from 2) is chain name or json
    const parameter = process.argv[2]
    // second until last arguments are input of the first chain
    const argv = process.argv.slice(3)
    // execute Yaml
    core.executeChain(parameter, argv)
  } else {
    // show missing arguments warning
    console.error('Missing Arguments')
    console.error('USAGE:')
    console.error('* ' + process.argv[1] + ' [chain-file]')
    console.error('* ' + process.argv[1] + ' [yaml-formatted-chain]')
  }
}
