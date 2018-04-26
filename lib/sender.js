'use strict'
require('cache-require-paths')

module.exports = {
  send
}

const request = require('request')

function send (host, chain, params, callback) {
  let timeout = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 6000
  request.post({'url': host, 'form': {'chain': chain, 'input': params}, 'timeout': timeout}, function (error, response, body) {
    if (error) {
      return callback(error, {})
    }
    try {
      let output = JSON.parse(body)
      if (!output.success) {
        return callback(new Error(output.errorMessage), null)
      }
      return callback(null, output.data)
    } catch (parseError) {
      callback(parseError, null)
    }
  })
}
