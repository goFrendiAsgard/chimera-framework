'use strict'
require('cache-require-paths')

module.exports = requireOnce

let REQUIRE_MEMO = {}

function requireOnce (moduleName) {
  if (moduleName in REQUIRE_MEMO) {
    return REQUIRE_MEMO[moduleName]
  }
  REQUIRE_MEMO[moduleName] = require(moduleName)
  return REQUIRE_MEMO[moduleName]
}
