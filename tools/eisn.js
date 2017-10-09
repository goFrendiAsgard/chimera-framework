#! /usr/bin/env node
'use strict'

// imports
let chimera = require('../index.js')

if (require.main === module) {
    // The program needs at least 3 parameter (excluding the default 3)
    // Example: node eisn.js src.java src.class javac src.java
  if (process.argv.length > 3) {
    let srcFile = process.argv[2]
    let dstFile = process.argv[3]
    let command = process.argv.slice(4).join(' ')
    chimera.eisn(srcFile, dstFile, command)
  } else {
        // show missing argument warning
    console.error('Missing Arguments')
    console.error('USAGE:')
    console.error('* ' + process.argv[1] + ' [src-file] [dst-file] [command]')
  }
}
