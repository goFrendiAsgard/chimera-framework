# Chimera Web Application 

## Prerequisites
In order to run this application, you need to have
* Mongodb
* Node.Js
* npm
installed in your computer

## TODO
* Edit `webConfig.js`, set your `mongoUrl` setting
* Run migration by invoking `npm run-script migrate`
* Start the server by invoking `npm start`

# Quick Reference

## Run Migration
* Invoke `npm run-script migrate up` or `npm run-script migrate` to upgrade 
* Invoke `npm run-script migrate down` to downgrade 
* Invoke `npm run-script migrate up [version]` to upgrade to certain `[version]`
* Invoke `npm run-script migrate down [version]` to downgrade to certain `[version]`

## Run Server
* Invoke `npm start`
* Or invoke `node index.js`

## Testing
* Run migration (`npm run-script migrate up`)
* When prompted for superAdmin's username and password, please type `admin` and `admin`
* Run the test (`npm test`)
