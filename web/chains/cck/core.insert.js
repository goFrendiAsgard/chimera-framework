const processor = require('./lib.processor.js')
module.exports = processor(['beforeInsertChain', 'insertChain', 'afterInsertChain'], 'insertGroups', true)
