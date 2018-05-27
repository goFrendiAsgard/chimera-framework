'use strict'

module.exports = {
  parseChiml
}

const requireOnce = require('./require-once.js')
let util, yaml
let SUCCESS_PARSE = {}
let FAIL_PARSE = {}

const SEQUENCE_ITEM_PATTERN = /^(\s*)-(\s+)(>|\|)(.+)$/gm
const MAP_ITEM_PATTERN = /^(\s*)([-\s\w]+:)(\s+)(>|\|)(.+)$/gm
const STRING_PATTERN = /^(>|\|)(.+)$/gm

function getStandardizedYaml (chimlScript) {
  util = requireOnce('./util.js')
  // sequence item where it's value preceeded by '|' or '>'
  chimlScript = chimlScript.replace(SEQUENCE_ITEM_PATTERN, function (whole, spaces1, spaces2, blockDelimiter, str) {
    return spaces1 + '-' + spaces2 + util.getQuoted(str)
  })
  // map item and map in sequence item where it's value preceeded by '|' or '>'
  chimlScript = chimlScript.replace(MAP_ITEM_PATTERN, function (whole, spaces1, key, spaces2, blockDelimiter, str) {
    return spaces1 + key + spaces2 + util.getQuoted(str)
  })
  // string preceeded by '| or '>'
  chimlScript = chimlScript.replace(STRING_PATTERN, function (whole, blockDelimiter, str) {
    return util.getQuoted(str)
  })
  return chimlScript
}

function parseChiml (chimlScript, callback) {
  chimlScript = String(chimlScript)
  if (chimlScript in SUCCESS_PARSE) {
    return callback(null, SUCCESS_PARSE[chimlScript])
  } else if (chimlScript in FAIL_PARSE) {
    return callback(FAIL_PARSE[chimlScript], null)
  }
  try {
    const obj = JSON.parse(chimlScript)
    SUCCESS_PARSE[chimlScript] = obj
    return callback(null, obj)
  } catch (error) {
    try {
      yaml = requireOnce('js-yaml')
      chimlScript = getStandardizedYaml(chimlScript)
      const obj = yaml.safeLoad(chimlScript)
      SUCCESS_PARSE[chimlScript] = obj
      return callback(null, obj)
    } catch (yamlError) {
      FAIL_PARSE[chimlScript] = yamlError
      return callback(yamlError, null)
    }
  }
}
