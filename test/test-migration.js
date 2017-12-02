/* eslint-env mocha */

// 1. upgrade(options, callback): should have 4 records
// 2. downgrade(options, callback): should have 0 records
// 3. upgrade(options, '003', callback): should have 3 records
// 4. downgrade(options, '002', callback): should have 1 records
