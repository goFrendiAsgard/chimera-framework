/* eslint-env mocha */

const path = require('path')
const chai = require('chai')
const chimera = require('../index.js')
const app = require('./fractures/web/app.js')
const assert = chai.assert
const request = require('request')

let server

describe('web', function () {

  it('app.listen shoud return http.server. It should be runnable and listening for request', function (done) {
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

  it('should serve hello-json', function (done) {
    request('http://localhost:3010/hello-json', function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, '{"data":"Hello :D"}')
      done()
    })
  })

  it('should serve hello-pug', function (done) {
    request('http://localhost:3010/hello-pug', function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, '<!DOCTYPE html><html><body><h1>This is Pug</h1><p>Hello :D</p></body></html>')
      done()
    })
  })

  it('should serve hello-ejs', function (done) {
    request('http://localhost:3010/hello-ejs', function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, '<h1>This is EJS</h1>\n<p>Hello :D</p>\n\n')
      done()
    })
  })

  it('should serve hello-hook (defined in hook-startup.chiml)', function (done) {
    request('http://localhost:3010/hello-hook', function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, 'Hello :D')
      done()
    })
  })

  it('should serve hello-hook/:name (defined in hook-startup.chiml)', function (done) {
    request('http://localhost:3010/hello-hook/emiya', function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, 'Hello emiya')
      done()
    })
  })

  it('should serve plus-one-query (defined in hook-startup.chiml)', function (done) {
    request('http://localhost:3010/plus-one-query?data=3', function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, '4')
      done()
    })
  })

  it('should serve plus-one-body (defined in hook-startup.chiml)', function (done) {
    request.post({url: 'http://localhost:3010/plus-one-body', form: {data: 3}}, function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, '4')
      done()
    })
  })

  it('should serve plus-one-cookie (defined in hook-startup.chiml)', function (done) {
    let cookieJar = request.jar();
    let cookie = request.cookie('data=3');
    let url = 'http://localhost:3010/plus-one-cookie';
    cookieJar.setCookie(cookie, url);
    request({url: url, jar: cookieJar}, function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(body, '4')
      done()
    })
  })

  it('plus-one-cookie should send set-cookie response with correct value', function (done) {
    let cookieJar = request.jar();
    let cookie = request.cookie('data=3');
    let url = 'http://localhost:3010/plus-one-cookie';
    cookieJar.setCookie(cookie, url);
    request({url: url, jar: cookieJar}, function (error, response, body) {
      if (error) {
        return done(error)
      }
      assert.equal(response.headers['set-cookie'][0], 'data=4; Path=/')
      done()
    })
  })


  it('http.server returned by app.listen should be closeable programmatically', function (done) {
    server.close()
    assert.equal(server.listening, false)
    done()
  })

})
