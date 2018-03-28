'use strict'
require('cache-require-paths')

const cmd = require('./lib/cmd.js')
const core = require('./lib/core.js')
const corePreprocessor = require('./lib/core-preprocessor.js')
const coreDollar = require('./lib/core-dollar.js')
const coreChimlParser = require('./lib/core-chiml-parser.js')
const mongo = require('./lib/mongo.js')
const util = require('./lib/util.js')
const web = require('./lib/web.js')
const sender = require('./lib/sender.js')
const server = require('./lib/server.js')
const eisn = require('./lib/eisn.js')
const migration = require('./lib/migration.js')

// The exported resources
module.exports = {
  corePreprocessor,
  coreChimlParser,
  coreDollar,
  cmd,
  util,
  mongo,
  core,
  web,
  sender,
  server,
  eisn,
  migration
}
