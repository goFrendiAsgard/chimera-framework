#! /usr/bin/env node
'use strict'

if (require.main === module) {
  const args = process.argv.slice(2)
  for (let i = 0; i < args.length; i++) {
    console.log(args[i])
  }
}
