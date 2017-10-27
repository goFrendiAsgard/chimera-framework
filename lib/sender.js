#! /usr/bin/env node
'use strict'

module.exports = {
  send
}

const util = require('./util.js')
const querystring = require('querystring')
const request = require('request')

function send (host, chain, params, callback) {
  let bodyRequest = querystring.stringify({'chain': chain, 'input': params})
  let timeout = process.env.TIMEOUT? parseInt(process.env.TIMEOUT): 6000
  request.post({url: host, form: bodyRequest, timeout: timeout}, function (error, response, body) {
    if (error) {
      return callback(error, {})
    }
    try {
      let output = JSON.parse(body)
      return callback(null, output.response)
    } catch (parseError) {
      callback(parseError, {})
    }
  })
}
