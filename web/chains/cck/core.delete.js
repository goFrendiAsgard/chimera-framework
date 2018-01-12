const processor = require('./lib.processor.js')
module.exports = processor(['beforeDeleteChain', 'deleteChain', 'afterDeleteChain'], 'deleteGroups', false)
