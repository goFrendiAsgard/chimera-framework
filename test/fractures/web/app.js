const chimera = require('chimera-framework')
const path = require('path')
const port = 3010
const webConfig = {
  'routes': [{
    'route': '/hello',
    'method': 'all',
    'chain': path.join(__dirname, 'chains/hello.chiml')
  }],
  'staticPath': path.join(__dirname,  'public'),
  'faviconPath': path.join(__dirname, 'public/favicon.ico'),
  'viewPath': path.join(__dirname, 'views'),
  'errorTemplate': path.join(__dirname, 'views/error.pug')
}

let app = chimera.web.createApp(webConfig)

app.listen(port, function () {
  console.error('Start at port ' + port)
})

