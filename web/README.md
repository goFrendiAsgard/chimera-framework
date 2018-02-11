# Chimera Web Application 

## Prerequisites
Before run the application, you need to make sure you have following softwares installed in your computer:
* Node.Js
* npm
* Mongodb

## TODO
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

## Docker
* Build docker image (`docker build -f dockerfile -t cms-docker .`)
* Run docker image (`docker run --rm -it -p 3000:3000 cms-docker`)
* For more information, you can refer to [this](https://blog.hasura.io/an-exhaustive-guide-to-writing-dockerfiles-for-node-js-web-apps-bbee6bd2f3c4) article.