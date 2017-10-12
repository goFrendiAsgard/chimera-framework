#! /usr/bin/env node
'use strict'

let cmd = require('./lib/cmd.js')
let core = require('./lib/core.js')
let corePreprocessor = require('./lib/core-preprocessor.js')
let coreDollar = require('./lib/core-dollar.js')
let coreChimlParser = require('./lib/core-chiml-parser.js')
let db = require('./lib/db.js')
let util = require('./lib/util.js')
let web = require('./lib/web.js')
let sender = require('./lib/sender.js')
let server = require('./lib/server.js')
let eisn = require('./lib/eisn.js')

// The exported resources
module.exports = {
  'preprocessor': corePreprocessor,
  'chimlParser': coreChimlParser,
  'dollar': coreDollar,
  'executeChain': core.executeChain,
  'runChain': core.runChain,
  'eisn': util.eisn,
  'cmd': cmd,
  'util': util,
  'db': db,
  'core': core,
  'web': web,
  'sender': sender,
  'server': server,
  'eisn': eisn
}
