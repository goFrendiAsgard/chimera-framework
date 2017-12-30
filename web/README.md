# Your Web App
This is the readme boiler for your web application

## Prerequisites
* Mongodb
* Node.Js

## Run Migration
* Invoke `npm run-script migrate up` to upgrade 
* Invoke `npm run-script migrate down` to downgrade 
* Invoke `npm run-script migrate up [version]` to upgrade to certain `[version]`
* Invoke `npm run-script migrate down [version]` to downgrade to certain `[version]`

## Run Server
Invoke `npm start` to run the server

## Testing
The steps to do the testing is as follow:
* Install `postman`
* Run migration (`npm run-script migrate up`)
* When prompted for superAdmin's username and password, please type `admin` and `admin`
* Run the server (`npm start`)
* Start another terminal, and run the test (`npm test`)
