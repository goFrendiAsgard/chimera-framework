const processor = require('./lib.processor.js')
module.exports = processor(['beforeSelectChain', 'selectChain', 'afterSelectChain'], 'selectGroups')
