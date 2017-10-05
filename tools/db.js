#! /usr/bin/env node
'use strict'

let chimera = require('../index.js')

if (require.main === module) {
  if (!isParameterValid()) {
    showUsage()
    console.log(JSON.stringify({'success': false, 'error_message': 'Missing or invalid parameters'}))
  } else {
    try {
      let action = process.argv[2]
      let dbConfig = JSON.parse(process.argv[3])
      if (action == 'find') {
        let filter = process.argv.length > 4 ? process.argv[4] : {}
        let projection = process.argv.length > 5 ? JSON.parse(process.argv[5]) : {}
        chimera.db.find(dbConfig, filter, projection)
      } else if (action == 'insert') {
        let data = process.argv.length > 4 ? JSON.parse(process.argv[4]) : {}
        let options = process.argv.length > 5 ? JSON.parse(process.argv[5]) : {}
        chimera.db.insert(dbConfig, data, options)
      } else if (action == 'update') {
        let filter = process.argv.length > 4 ? process.argv[4] : {}
        let data = process.argv.length > 5 ? JSON.parse(process.argv[5]) : {}
        let options = process.argv.length > 6 ? JSON.parse(process.argv[6]) : {}
        chimera.db.update(dbConfig, filter, data, options)
      } else if (action == 'remove') {
        let filter = process.argv.length > 4 ? process.argv[4] : {}
        let options = process.argv.length > 5 ? JSON.parse(process.argv[5]) : {}
        chimera.db.remove(dbConfig, filter, options)
      }
    } catch (err) {
      console.error(err.stack)
      console.log(JSON.stringify({'success': false, 'error_message': 'Operation failure, invalid parameters'}))
      chimera.db.closeConnection()
    }
  }
}
