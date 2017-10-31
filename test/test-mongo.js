/* eslint-env mocha */

const chai = require('chai')
const assert = chai.assert
const chimera = require('../index.js')

let softDb = getManager('mongodb://localhost/test')
let db = getManager('mongodb://localhost/test', {excludeDeleted: false, showHistory: true})
let softGod = getCollection(softDb, 'gods')
let god = getCollection(db, 'gods')

describe('mongo', function () {
})
