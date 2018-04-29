#! /usr/bin/env node
'use strict'

require('cache-require-paths')
const server = require('../lib/server.js')

if (require.main === module) {
  server.serve({}, function (error, result) {
    if (error) {
      console.error(error)
    }
  })
}
