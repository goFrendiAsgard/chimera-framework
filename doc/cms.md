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

You can access `configuration` by clicking `Settings | Configurations`

Some configurations will merely change the layout of the CMS, while some others will seriously affect how the system works.

Some configurations that you probably like to fiddle up are:

* __title__

  The title of your CMS. Will be shown in top menu as well as jumbotron. Any valid `string` will be okay.

* __jargon__ 

  The jargon of your CMS. Will be shown in the jumbotron. Any valid `string` will be okay.

* __logo__

  The logo of your CMS. Will be shown in the jumbotron. You can upload any image file here.

* __bootstrapNavClass__

  Custom `CSS` class for the top menu. The possible values are:
  - *navbar-default (default)*
  - *navbar-default navbar-static-top (default static)*
  - *navbar-default navbar-fixed-top (default fixed)*
  - *navbar-inverse (inverse)*
  - *navbar-inverse navbar-static-top (inverse static)*
  - *navbar-inverse navbar-fixed-top (inverse fixed)*

  Bootstrap navigation classes consists of two parts.

  The first part (*default* or *inverse*) allows you to choose between *default* color or *inverse* color. If you use the default theme, the *default* color is white, while the *inverse* color is black.

  The second part (*[empty]*, *static*, or *fixed*) define the behavior (CSS position property) of the menu.

* __bootstrapTheme__

  Custom bootstrap theme, including `cerulean`, `united`, `simplex`, etc. This will affect the look and feel of your CMS.

* __navigation__

  Two level depth navigation structure in JSON array-of-object format. The navigation menu will be rendered at the top or left part of the page if `showTopNav` or `showLeftNav` are set to `true`. The default value is:
  ```json
  [
    {
      "caption": "Home",
      "groups": [],
      "url": "/"
    },
    {
      "caption": "Settings",
      "groups": [
        "superAdmin"
      ],
      "children": [
        {
          "caption": "Routes",
          "groups": [
            "superAdmin"
          ],
          "url": "/data/routes"
        },
        {
          "caption": "Groups",
          "groups": [
            "superAdmin"
          ],
          "url": "/data/groups"
        },
        {
          "caption": "Users",
          "groups": [
            "superAdmin"
          ],
          "url": "/data/users"
        },
        {
          "caption": "Configurations",
          "groups": [
            "superAdmin"
          ],
          "url": "/data/configs"
        },
        {
          "caption": "Content Construction Kit",
          "groups": [
            "superAdmin"
          ],
          "url": "/data/cck"
        }
      ]
    },
    {
      "caption": "Show Case",
      "children": [
        {
          "caption": "Noble Phantasm",
          "url": "/data/hogu"
        },
        {
          "caption": "Servants",
          "url": "/data/servants"
        }
      ]
    }
  ]
  ```
  Each navigation can has these properties:
  - *caption*

    A human readable caption. Any valid HTML will be okay. You can even put images here.

  - *groups*

    Define the user groups that can see the menu. If not present, everyone will be able to see the menu.
    
    Please note that navigation has nothing to do with the real page authorization. So, eventhough you set the menu to be accessible by everyone, you will still need to set the permission to access the page separately.

    This also means that some pages might be accessible eventhough you don't make it available through the navigation.

  - *url*

    The url of that will be accessible from the navigation menu. Should be preceeded with `/` if refer to a local page, and should be preceeded with either `http://`, `https://`, or any other valid protocol if refer to external url

  - *children*

    Array-of-object. The sub navigations which are parts of this current navigation menu.

* __showTopNav__

  Determine whether `top navigation` should be visible or not.

* __showLeftNav__

  Determine whether `left navigation` should be visible or not.

* __showJumbotron__

  Determine whether `jumbotron` should be visible or not.

* __jumbotron__

  HTML formatted jumbotron content. By default it will show the `logo`, `title`, and `jargon`. But you can custom it anyway.

  The default value is as follow:

  ```html
  <div class="jumbotron col-sm-12">
    <div class="col-sm-2">    
      <img class="col-sm-12" src="<%%= config.logo %>" />
    </div>
    <div class="col-sm-10">
      <h1><%%= config.title %></h1>      
      <p><%%= config.jargon %></p>
    </div>
  </div>
  ```

* __showFooter__

  Determine whether `footer` should be visible or not.

* __footer__

  HTML formatted footer content. The default value is:
  ```html
  <footer style="margin-bottom:20px; text-align:right; font-size:0.8em;">
    Chimera web app &copy; 2018-tomorrowMorning
  </footer>
  ```

* __showRightWidget__

  Determine whether `rightWidget` should be visible or not.

* __rightWidget__

  HTML formatted Right widget content. You can put `paypal-donation-button`, `google-advertisement` or anything here.

# Routes

Routing is a very important aspect of any web application. If you came from vanilla PHP, you might be unfamiliar with this concept since PHP automatically map the physical file location to the URL.

This is pretty convenient since you can just create a new file in order to make a new page. However it come with a drawback. For example, a hacker can simply determine what framework you are using by accessing the urls. The most common scenario is, a hacker will try to access `/wp-admin`. If it works, than the hacker can be sure if you are using wordpress.

However, if you are already familiar with other framework like `Laravel`, `Django`, or `express`, you might already understand the concept of routing.

To manage your CMS routes, you can access `Settings | Routes`

A route consists of several properties:

* __Name__
  
  The name of the route. Make sure it is something self-explaining, like `Landing Page`, `Front Page`, `About Page`, etc.

  Route name will not rendered by the system. It just help you to understand what the current route do.

* __Route__

  The url of the route. Should be prepended with `/`.

* __Method__

  The HTTP method of the route. You can determine whether a route is only serve `GET`, `POST`, or `DELETE` requests. Or you can set a route to serve `all` requests.

* __Chain__

  The `CHIML` script or `chain` location to prepare a data that will be shown to the user.

  The `chain` takes a single parameter `state` as an input and should return a `response` object.

* __View__

  An `ejs` template. To determine how your page will be presented to a user. A simplest route can only contains a `name`, a `route`, and a `view`

* __Groups__

  Groups of users that are authorized to access the page.

## More about Chain

A Route chain can be a `CHIML script` (written directly in the text area), or the physical location of either `CHIML` or `Javascript` file acting as `chain`.

Writing the `chain` in `Javascript` will make the chain run faster. However whenever you modify the `chain`, you need to reload the server.

On the other hand, writing the chain in `CHIML script` make the chain more flexible and arguably more readable. But it is going to be a bit slower.

* __state__
  
  A `state` contains of several keys like `request` and `config`. Below is the complete structure of a state:

  - __config__: An `object` represent CMS configuration
  - __request__: An `object` represent request from the client
    - __auth__: An `object` represent authentication state
      - __username__: Current user's username
      - __email__: Current user's email
      - __groups__: An `array` represent current user's groups
      - __id__: Current user's id
      - __iat__: iat
      - __exp__: expired time
    - __baseUrl__: Base URL
    - __hostname__: Hostname
    - __method__: HTTP method (`get`, `post`, `put`, etc)
    - __protocol__: HTTP protocol (`http` or `https`)
    - __url__: URL, relative to Base Url
    - __query__: An `object` represent the data sent by using `get` method. In PHP, this property is equal to `$_GET`
    - __body__: An `object` represent the data sent by using methods other than `get`. In PHP, this property is roughly equal to `$_POST`
    - __cookies__: An `object` represent cookies sent by the client. In PHP, this is equal to `$_COOKIES`
    - __files__: An `objet` represent files sent by the client. In PHP, this property is roughly equal to `$_FILES`
    - __params__: An `object` represent the URL parameters. For example if you have `/blog/:date/:title` as route url, you will have `state.request.params.date` and `state.request.params.title` respectively.
    - __session__: An `object` represent the session data of the connection. This is equal to `$_SESSION` in PHP.
  - __response__: A `string` or an `object` represent the temporary response sent to the client.
    - __data__: An `object` sent to the view to be rendered. If the view is not defined (either as part of the `response` or defined independently in the route), a JSON representation of the `response.data` will be sent.
    - __view__: A `string`, the `view` template
    - __session__: An `object`, represent the new `session` data
    - __cookies__: An `object`, represent the new `cookies` data
    - __status__: HTML status. Typically will be `200` for normal request. If greater or equal to `400`, it will yield an error response.
    - __errorMessage__: A `string`, the error message
  - __matchedRoute__: The matching `route`
    - __route__
    - __method__
    - __chain__
    - __groups__
    - __view__

* __response__
  
  `response` can be an object (as defined in `state`) or can be a `string`. 
  
  If the `response` is a string, it will be sent directly to the client.

  If the `response` is an object, it will be rendered in the corresponding `view` template.

  However, if the `view` template is not defined, A JSON representative of `response.data` will be returned.

## Route Examples

### Hello world

The simplest route example is no other than typical `hello world` application. In order to create a `hello world` page, you can make a new route and set these properties:

* name: `hello world`
* route: `/hello`
* view: `<p>hello world</p>`

You can access the page by typing `http://localhost:3000/hello`

### Hello name (without view)

To make a more dynamic page, you can use `parameters` and set your route's property as follow:

* name: `hello world (without view)`
* route: `/hello/:name`
* chain:
  ```yaml
  ins: state
  out: response
  do: |response.data <-- ("Hello " + state.request.params.name)
  ```

You can access the page by typing `http://localhost:3000/hello/Tony`

### Hello name (with view)

One of common best practice is to separate the data from the view. Considering the previous example, you can make a better approach by setting your route as follow:

* name: `hello world (with view)`
* route: `/hello-view/:name`
* chain:
  ```yaml
  ins: state
  out: response
  do: |response.data.name <-- (state.request.params.name)
  ```
* view: `<p>Hello <%= name %></p>`

You can access the page by typing `http://localhost:3000/hello/Tony`

### ls -al && cal

One of Chimera-Framework selling point is you can use any CLI commands/programs as part of your application. So that it will slightly reduce your development time.

In this example, we will try to read `dir` and `year` query request and use it to run `ls` and `cal` respectively.

`ls` is a Unix builtin tool to view the directory, while `cal` is a Unix program to show a calender (either monthly or anually)

You can set your route as follow:

* name: `test`
* route: `/test`
* chain:
  ```yaml
  ins: state
  out: response
  do:
  - |get <-- (state.request.query)
  - |(get.dir) -> ls -al -> response.data.list
  - |(get.year) -> cal -> response.data.calendar
  - |response.partial.rightWidget <-- ("This is the right widget")
  ```
  view:
  ```html
  <h1>ls -al</h1>
  <pre><%= list %></pre>
  <h1>cal</h1>
  <pre><%= calendar %></pre>
  ```

You can access the page by typing `http://localhost:3000/test?dir=.&year=2018` in your address bar

# CCK

CCK stands for `Content Construction Kit`. It is a tool to help you creating a CRUD application quickly. 

CCK is not a code generator. No code generated when you make a new entity. This mean, whenever you modify your CCK entity, the changes will be reflected immediately.

CCK will work in most use cases. Technically, you can even use CCK to build CCK.

Under the hood, CCK will dynamically create several routes and apply it immediately. Aside from the visual pages, The routes will also serve REST API as well. This is going to be useful in case of you want to create a mobile/desktop application use Chimera-Framework as the backend.

Below is the routes generated by CCK:

* GET `/api/:version/:schemaName`: Select bulk API
* POST `/api/:version/:schemaName`: Insert bulk API
* PUT `/api/:version/:schemaName`: Update bulk API
* DELETE `/api/:version/:schemaName`: Delete bulk API
* GET `/api/:version/:schemaName/:id`: Select one API
* POST `/api/:version/:schemaName/:id`: Insert one API
* PUT `/api/:version/:schemaName/:id`: Update one API
* DELETE `/api/:version/:schemaName/:id`: Delete one API
* ALL `/data/:schemaName`: Tabular view
* ALL `/data/:schemaName/:id`: Detail view
* ALL `/data/:schemaName/insert`: Insert Form
* POST `/data/:schemaName/insert`: Insert Action
* ALL `/data/:schemaName/update`: Update Form
* POST `/data/:schemaName/update`: Update Action
* ALL `/data/:schemaName/delete`: Delete Form
* POST `/data/:schemaName/delete`: Delete Action

To create a new CCK Entity, you can click on `Settings | Content Construction Kit`.

A CCK Entity has several properties:

* __Name__: The schema name of the CCK.
* __Collection Name__: The physical collection name of the CCK
* __Fields__: Field list in `JSON Array` format. Below is the example of field list:
  ```json
  {
    "picture": {
      "inputTemplate": "<%- cck.input.image %>",
      "presentationTemplate": "<%- cck.presentation.image %>"
    },
    "name": {
      "notNull": 1,
      "unique": 1
    },
    "class": {
      "inputTemplate": "<%- cck.input.option %>",
      "presentationTemplate": "<%- cck.presentation.option %>",
      "options": {
        "saber": "Saber",
        "lancer": "Lancer",
        "archer": "Archer",
        "rider": "Rider",
        "caster": "Caster",
        "assassin": "Assassin"
      }
    },
    "mainNoblePhantasm": {
      "caption": "Noble Phantasm",
      "inputTemplate": "<%- cck.input.many2one %>",
      "presentationTemplate": "<%- cck.presentation.many2one %>",
      "ref": "hogu",
      "keyField": "name",
      "fields": [
        "picture",
        "name",
        "description"
      ]
    },
    "otherNoblePhantasm": {
      "caption": "Secondary Noble Phantasm",
      "inputTemplate": "<%- cck.input.one2many %>",
      "presentationTemplate": "<%- cck.presentation.one2many %>",
      "fields": {
        "name": {
          "inputTemplate": "<%- cck.input.many2one %>",
          "presentationTemplate": "<%- cck.presentation.many2one %>",
          "ref": "hogu",
          "keyField": "name",
          "fields": [
            "picture",
            "name",
            "description"
          ]
        },
        "story": {
          "inputTemplate": "<%- cck.input.textArea %>",
          "tabularPresentationTemplate": "<%- cck.presentation.trimmedText %>",
          "presentationTemplate": "<%- cck.presentation.text %>"
        }
      }
    }
  }
  ```
* __Tabs__: `JSON Object`, the tabs available
* __Partials__: `JSON Object`, the custom partials
* __Insert Privileges__: List of user groups authorized for insert operation
* __Update Privileges__: List of user groups authorized for update operation
* __Delete Privileges__: List of user groups authorized for delete operation
* __Select Privileges__: List of user groups authorized for select operation
* __Init Chain__: Initialization chain.
* __Select Chain__: Select API chain
* __Before Select Chain__: Before select chain
* __After Select Chain__: After select chain
* __Show View__: Tabular view
* __Show One View__: Detail view
* __Insert Chain__: Insert API chain
* __Before Insert Chain__: Before insert chain
* __After Insert Chain__: After insert chain
* __Insert Form View__: Insert form view
* __Insert Action View__: Insert action view
* __Update Chain__: Update API chain
* __Before Update Chain__: Before update chain
* __After Update Chain__: After update chain
* __Update Form View__: Update form view
* __Update Action View__: Update action view
* __Delete Chain__: Delete API chain
* __Before Delete Chain__: Before delete chain
* __After Delete Chain__: After delete chain
* __Delete Action View__: Delete action view