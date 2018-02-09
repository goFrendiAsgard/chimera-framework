var newman = require('newman') // require newman in your project
var web = require('./index.js')

let server = web.server
let port = 3000
// Start the server
let serverHandler = server.listen(port, function () {
  console.error('Start test session at port ' + port)
  // Run the test
  newman.run({
    collection: require('./test-web.json'),
    reporters: 'cli'
  }, function (err) {
    if (err) { throw err }
    // Stop the server
    serverHandler.close()
    console.log('Test session complete!')
  })
})
