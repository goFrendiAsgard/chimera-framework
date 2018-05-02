'use strict'

module.exports = {
  send
}

const requireOnce = require('./require-once.js')
let request

function send (host, chain, params, callback) {
  const timeout = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 6000
  request = requireOnce('request')
  request.post({'url': host, 'form': {'chain': chain, 'input': params}, 'timeout': timeout}, function (error, response, body) {
    if (error) {
      return callback(error, {})
    }
    try {
      const output = JSON.parse(body)
      if (!output.success) {
        return callback(new Error(output.errorMessage), null)
      }
      return callback(null, output.data)
    } catch (parseError) {
      return callback(parseError, null)
    }
  })
}
