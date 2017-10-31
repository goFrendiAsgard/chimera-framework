/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const assert = chai.assert

let server
let cwd

describe('server and sender', function () {
  it('server run in the correct port', function (done) {
    cwd = process.cwd()
    process.chdir(__dirname)
    chimera.server.serve({port: 3011}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.equal(result.port, 3011)
      server = result.server
      done()
    })
  })

  it('should be able to execute square-distributed.chiml and get the result', function (done) {
    chimera.core.executeChain(path.join(__dirname, 'fractures/square-distributed.chiml'), ['http://localhost:3011', 10], {}, function (error, result) {
      if (error) {
        return done(error)
      }
      assert.strictEqual(result, 100)
      done()
    })
  })

  it('should return error when trying to acces circle-area.chiml', function (done) {
    chimera.sender.send('http://localhost:3011', path.join(__dirname, 'fractures/circle-area.chiml'), [4], function (error, result) {
      if (error) {
        assert.equal(error.message, 'Access to circle-area.chiml denied')
        return done()
      }
      done(new Error('Error expected, but no error found'))
    })
  })

  it('http.server returned by chimera.server.serve should be closeable programmatically', function (done) {
    server.close()
    process.chdir(cwd)
    assert.equal(server.listening, false)
    done()
  })
})
