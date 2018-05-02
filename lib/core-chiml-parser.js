'use strict'

module.exports = {
  parseChiml
}

const requireOnce = require('./require-once.js')
let util, yaml

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
  try {
    const obj = JSON.parse(chimlScript)
    callback(null, obj)
  } catch (error) {
    try {
      yaml = requireOnce('js-yaml')
      chimlScript = getStandardizedYaml(chimlScript)
      const obj = yaml.safeLoad(chimlScript)
      callback(null, obj)
    } catch (yamlError) {
      callback(yamlError, null)
    }
  }
}
