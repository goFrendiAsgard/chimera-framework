#! /usr/bin/env node
'use strict'

// imports
require('cache-require-paths')
const eisn = require('../lib/eisn.js')

if (require.main === module) {
  // Example: node eisn.js src.java src.class javac src.java
  if (process.argv.length > 3) {
    const srcFile = process.argv[2]
    const dstFile = process.argv[3]
    const command = process.argv.slice(4).join(' ')
    eisn(srcFile, dstFile, command)
  } else {
    // show missing argument warning
    console.error('Missing Arguments')
    console.error('USAGE:')
    console.error('* ' + process.argv[1] + ' [src-file] [dst-file] [command]')
  }
}
