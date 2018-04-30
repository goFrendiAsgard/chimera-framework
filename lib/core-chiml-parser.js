'use strict'

module.exports = {
  parseChiml
}

const requireOnce = require('./require-once.js')
let util, yaml

function isJson (script) {
  try {
    JSON.parse(script)
    return true
  } catch (error) {
    return false
  }
}

function getStandardizedYaml (chimlScript) {
  util = requireOnce('./util.js')
  // sequence item where it's value preceeded by '|' or '>'
  chimlScript = chimlScript.replace(/^(\s*)-(\s+)(>|\|)(.+)$/gm, function (whole, spaces1, spaces2, blockDelimiter, str) {
    return spaces1 + '-' + spaces2 + util.getQuoted(str)
  })
  // map item and map in sequence item where it's value preceeded by '|' or '>'
  chimlScript = chimlScript.replace(/^(\s*)([-\s\w]+:)(\s+)(>|\|)(.+)$/gm, function (whole, spaces1, key, spaces2, blockDelimiter, str) {
    return spaces1 + key + spaces2 + util.getQuoted(str)
  })
  // string preceeded by '| or '>'
  chimlScript = chimlScript.replace(/^(>|\|)(.+)$/gm, function (whole, blockDelimiter, str) {
    return util.getQuoted(str)
  })
  return chimlScript
}

function parseChiml (chimlScript, callback) {
  chimlScript = String(chimlScript)
  let isJsonScript = isJson(chimlScript)
  if (!isJsonScript) {
    chimlScript = getStandardizedYaml(chimlScript)
  }
  try {
    yaml = requireOnce('js-yaml')
    let obj = yaml.safeLoad(chimlScript)
    callback(null, obj)
  } catch (yamlError) {
    callback(yamlError, null)
  }
}
