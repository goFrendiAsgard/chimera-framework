#! /usr/bin/env node
'use strict'

require('cache-require-paths')
const sender = require('../lib/sender.js')

if (require.main === module) {
  if (process.argv.length > 3) {
    const host = process.argv[2]
    const chain = process.argv[3]
    const parameters = process.argv.slice(4)
    sender.send(host, chain, parameters, function (error, output) {
      if (error) {
        return console.error(error)
      }
      return console.log(output)
    })
  } else {
    console.error('INVALID ARGUMENTS')
  }
}
