/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const app = require('./fractures/web/app.js')
const assert = chai.assert
const request = require('request')

let server

describe('web', function () {
  it('app.listen shoud return http.server, and it should listening for request', function (done) {
    let port = 3010
    server = app.listen(port, function () {
      console.error('Start at port ' + port)
    })
    assert.equal(server.listening, true)
    done()
  })
  it('should serve hello-string', function (done) {
    request('http://localhost:3010/hello-string', function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, 'Hello :D')
      done()
    })
  })
  it('http.server should be closeable programmatically', function (done) {
    server.close()
    assert.equal(server.listening, false)
    done()
  })
})
