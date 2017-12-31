var newman = require('newman'); // require newman in your project
var web = require('./index.js')

let app = web.app
let port = 3000
// Start the server
let server = app.listen(port, function () {
  console.error('Start test session at port ' + port)
  // Run the test
  newman.run({
    collection: require('./test-web.json'),
    reporters: 'cli'
  }, function (err) {
    if (err) { throw err; }
    // Stop the server
    server.close()
    console.log('Test session complete!')
  });
})
