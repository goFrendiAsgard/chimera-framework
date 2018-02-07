const processor = require('./lib.processor.js')
const wrapper = require('./lib.documentPrivilegeWrapper.js')
const deleter = processor(['beforeDeleteChain', 'deleteChain', 'afterDeleteChain'], 'deleteGroups', false)

module.exports = wrapper(deleter, '_restrictDelete')