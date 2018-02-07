const processor = require('./lib.processor.js')
const wrapper = require('./lib.documentPrivilegeWrapper.js')
const updater = processor(['beforeUpdateChain', 'updateChain', 'afterUpdateChain'], 'updateGroups', true)

module.exports = wrapper(updater, '_restrictUpdate')