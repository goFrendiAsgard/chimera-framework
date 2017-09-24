#! /usr/bin/env node
'use strict';

let chimera = require('../index.js')
let port = 3000

let webConfig = {
    'routes': [
        {
            'route' : '/',
            'method' : 'all',
            'chain' : '',
        }
    ]
}

let app = chimera.web.createApp(webConfig)

app.listen(port, function () {
    console.log('Chimera service started at port ' + port)
})
