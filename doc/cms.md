# Content Management System (CMS)

CMS is a web application like `wordpress`, `drupal`, or `joomla`. It support digital content creation and modification. As well as multiple user in a collaborative environment. See [this reference](https://en.wikipedia.org/wiki/Content_management_system) for a more detail information about CMS

By using Chimera-Framework you can build your own CMS easily. What you need to do is just invoking
```bash
chimera-init-web <your-project-name>
```

# Creating your own CMS

To create your own CMS, you need to do the following steps
* Ensure every pre-requisites has been already installed in your computer:
  - Node.Js
  - npm
  - MongoDb
* Create the boilerplate by invoking `chimera-init-web <your-project-name>` in your terminal
* Change current directory to `<your-project-name>` by invoking `cd <your-project-name>`
* Run migration by invoking `npm run-script migrate`

If everything works correctly, you will see this output in your terminal (The process might take a while)

```
gofrendi@asgard:~$ chimera-init-web test
Mongodb Url (mongodb://localhost/test):
[INFO] Read chimera-framework's package.json...
[INFO] Done...
[INFO] Copying directory...
[INFO] Done...
[INFO] Creating project's package.json...
[INFO] Done...
[INFO] Creating webConfig.default.js...
[INFO] Done...
[INFO] Creating webConfig.js...
[INFO] Done...
[INFO] Performing npm install...
[INFO] Done...
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
gofrendi@asgard:~$ cd test
gofrendi@asgard:~/test$ npm run-script migrate

> test@0.0.0 migrate /home/gofrendi/test
> node migrate.js

SuperAdmin username:  admin
SuperAdmin email:  admin@admin.com
SuperAdmin password:  admin
[INFO] Migration succeed
* 0 up
* 0.001-insert-user up
* 0.002-basic-routes up
* 0.003-default-configs up
* 0.004-default-groups up
* 0.005-additional-inputs-and-presentations up
* 0.006-show-case-noble-phantasm up
* 0.007-show-case-servant up
gofrendi@asgard:~/test$
```
# Start the server

After the CMS ready, you can start the server by invoking `npm start` in the terminal

The default port will be `3000`. Thus you can access the CMS by openning your browser (I recommend google chrome) and type `http://localhost:3000`

# CMS File Structure

The structure of the CMS is as follow:
```
chains/ # This directory contains several `CHIML scripts` used by the CMS
  cck/  # Special CHIML script to run CCK
  cck.init.js # Every other CHIML script, including login etc
  ...
migrations/ # This directory contains the migration scripts.
  0.chiml
  ...
public/ # The public directory. Contains css, javascript, uploaded resources, and favicon
  css/
  js/
  uploads/
  favicon.ico
views/ # This directory contains the `ejs templates`
  cck/ # Special `ejs templates` used by CCK, either to render inputs and field presentation
    inputs/
      checkBoxes.ejs
      ...
    presentations/
      codeText.ejs
      ...
    default.deleteAction.ejs
    ...
  partials/ # Special `ejs templates`, will be shown in every page, depend on the configurations
    default.htmlHeader.ejs
    ...
  default.error.ejs
  default.layout.ejs
  default.login-page.ejs
  ...
cck.js      # CCK helper
helper.js   # common helper
index.js    # application start point
migrate.js  # migration script
package.json
README.md
test-web.json  # newman test
test.js        # API test
webConfig.default.js # default configuration
webConfig.js         # custom configuration
```

You are free to add any custom views, css, javascripts, or even templates. But please make sure to not touch the existing ones.

If it is really necessary (in case of you want to add your custom middleware or deal with socket programming), you can modify webConfig.js, since this file won't be overridden when you upgrade the CMS to the newer version.

# Configurations
# Routes
# CCK