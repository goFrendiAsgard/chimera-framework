const processor = require('./lib.processor.js')
module.exports = processor(['beforeUpdateChain', 'updateChain', 'afterUpdateChain'], 'updateGroups')
