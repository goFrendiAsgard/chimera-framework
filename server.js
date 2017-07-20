#! /usr/bin/env node

const express = require('express')
const chimera = require('chimera-framework/core')
const bodyParser = require('body-parser')
const path = require('path')
const currentPath = process.cwd()
let port = process.env.PORT || '3000'
let app = express()

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

function insidePublishedDirectory(file){
    // get published directory
    let publishedDirectory = process.env.PUBLISHED
    if(!publishedDirectory){
        return true
    }
    publishedDirectory = path.resolve(publishedDirectory)
    file = path.resolve(file)
    // is file in publised directory
    return file.search(publishedDirectory) == 0
}

app.post('/', function (req, res) {
    // force input to be array, even if it only contains single element
    let input = Array.isArray(req.body.input)? req.body.input: [req.body.input]
    let chain = req.body.chain
    // somethime chimera hangs up (in case of you call something like "ipython"), in this case altered callback to change back directory won't work, thus wie need to change directory manually
    process.chdir(currentPath)
    if(insidePublishedDirectory(chain)){
        // call chimera process
        chimera.executeYaml(chain, input, [], function(output, success, errorMessage){
            if(!res.headersSent){
                res.send(JSON.stringify({
                    'success' : success, 
                    'errorMessage' : errorMessage,
                    'response' : output,
                }))
            }
        })
    }
    else{
        res.send(JSON.stringify({
            'success' : false, 
            'errorMessage' : 'Cannot access ' + chain,
            'response' : '',
        }))
    }
})

let server = app.listen(port, function () {
    console.log('Chimera service started at port ' + port)
})

// read TIMEOUT from environment
if(process.env.TIMEOUT){
    server.timeout = parseInt(process.env.TIMEOUT)
}
