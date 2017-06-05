# Chimera Framework

Chimera-framework is a nodejs based framework that let you write any task in any language, and combine them for a greater good.

# Motivation

* Most (if not all) programming languages support command line interface

    Perl, python, php, ruby, haskell, javascript, c, java, pascal, R, and even matlab (See http://stackoverflow.com/questions/6657005/matlab-running-an-m-file-from-command-line) are supporting command line interface (CLI). Through CLI, different programs can communicate to each others. Chimera-framework provide mechanism to store global variables and to orchastrate the programs into a single flow.

* Some programming languages are better at some cases while other are excelled at other cases

    You might love PHP from the bottom of your heart, but it doesn't change the fact that doing heavy-statistic computation in R is easier. Rather than trying to make PHP do what R do, it is more easier to just use R instead.

* Atomic process

    Unix has a great philosophy. It encourage programmers to build a single program to do a single task. Nowadays, people try to make one thing to rule out everything. This might sounds good at first, but the effort will be futile. It is better to keep everything simple and combine those simple process to achieve a greater good.

* Scalability

    By creating independent simple programs, you can make a lot of possibility. There is a hero in DOTA named Invoker that can combine his orbs to activate 10 different abilities (http://dota2.gamepedia.com/Invoker#Invoked_abilities). Rather than building a monolithic program that won't scale, it is better to make simple programs, and combine them as you need.

* Less language migration

    Sometime you need a certain feature that is only available in an esoteric-new-programming-language. You learn the language, convert all your old projects into this new language, and loosing the meaning of life. Just never do that anymore. Chimera framework goal is to let you write any task in any language, and combine them to achieve a greater good.


# Installation

* From source (require `git`)

```sh
git clone git@github.com:goFrendiAsgard/chimera.git
npm install
npm link
```
* Using npm

```sh
npm install --global chimera-framework
```

# Prerequisites

* nodejs
* npm
* any programming languages you want to use

# Is it working?

You can run the test case by running `npm test`. There will be two cases and each of them will yield `-23`

# Usage (command line)

## Using YAML File

* Define your chain progress in `yaml` format

    Let's try to make a chain file to execute `Python`, `Javascript`, `Java`, and `PHP` program to solve a simple math problem


```yaml
# Location: your-chain-file.yaml
# THE MAIN PROCESS:
#   f = ((a+b) * (a-b)) + a
# THE SUBPROCESSES:
#   Process 1: c = a + b (we will use Python)
#   Process 2: d = a - b (we will use Java)
#   Process 3: e = c * d (we will use PHP)
#   Process 4: f = e + a (we will use javascript)
# THE FLOW:
# Process 1 and Process 2 will be executed in parallel since they are independent to each other
# After Process 1 and Process 2 finished, Process 3 and Process 4 should be executed in serial 
# Process 3 depend on both Process 1 and 2, and Process 4 depend on Process 3

ins: a,b # The inputs of main process
out: f # The outputs of main process
series:
  # Process 1 and 2
  - parallel:
      # Process 1 (in Python)
      - ins: a, b
        out: c
        command: python programs/add.py
      - series: # Process 2 (in Java)
          # First, compile the source 
          - javac programs/Substract.java
          # then run the program
          - ins: a, b
            out: d
            command: java -cp programs Substract
  # Process 3 (in PHP)
  - ins: c, d
    out: e
    command: php programs/multiply.php
  # Process 4 (in Javascript)
  - ins: e, a
    out: f
    command: node programs/add.js
```

* Execute the chain by invoking: 

```sh
chimera your-chain-file.yaml 5 1
``` 

This will give you `29` since  `((5+1) * (5-1)) + a = 29`

## Parsing YAML directly 

```sh
chimera "command : cal"
```
This will call `cal` command (works on linux) and show you current month's calendar

## Parsing command directly

This will also do the same

```sh
chimera cal
```

# Usage (programmatically)

```javascript
const chimera = require('chimera-framework/core');

// without presets
chimera.executeYaml('your-chain-file.yaml', [5, 1], {}, function(output){
    console.log(output);
});


// with presets
chimera.executeYaml('your-chain-file.yaml', {}, {a: 5, b: 1}, function(output){
    console.log(output);
});
```

Function `executeYaml` has 4 parameters, `executeYaml(yamlFile, inputs, presets, callback)`

* `yamlFile` : The chain file in YAML format
* `inputs` : Array of inputs
* `presets` : Initial values of variables
* `callback` : Callback function. Should has two parameter. The first parameter to hold the output of the chain, while the second one is boolean which value is going to be `true` if the chain succeed and `false` if there is any error.

# Web Framework

## Init Project

Run this command to scaffold a web project:

```sh
chimera-init-web myApp
```

The structure of your web application will be:
```sh
▾ myApp/
  ▸ bin/
  ▸ chains/
  ▸ node_modules/
  ▾ public/
    ▸ images/
    ▸ javascripts/
    ▸ stylesheets/
      favicon.ico
  ▾ views/
      error.pug
      index.pug
      layout.pug
      test-ejs.ejs
      test-pug.pug
    app.js
    config.yaml
    package.json
    route.yaml
```

To run the web server, you can simply move to `myApp` directory and run `npm start`

## Configurations (config.yaml)
* `mongo_url` 
Some core programs are using mongodb.

By default, the value will be `mongodb://localhost/myApp` (depend on your application name).

* `public_path`
The public directory where you put all static resources (javascript, css, images, etc). 

By default, the value will be `public`.

* `migration_path`
The directory contains all migration chains. 

By default, the value will be `chains/migrations`.

The migration chains should be in this format: `YYmmddHis-up-[name-of-migration].yaml` or `YYmmddHis-down-[name-of-migration].yaml` 

* `favicon_path`
The favicon path. 

By default, the value will be `public/favicon.ico`

* `view_path`
The directory contains view templates (either pug, ejs, or handlebars). 

By default, the value will be `views`

* `error_template` 
The error template.

By default, the value will be `error.pug`

* `session_secret` 
The session secret.

By default, the value will be `mySecret`

* `session_max_age`
Session max age (in seconds).

By default, the value will be `60000`

* `session_save_unitialized`
If this is true, the session will be saved and updated in each request

By default, the value will be `true`

* `session_resave`

By default, the value will be `true`

* `login_validation_chain` 

Login validation chain. Require `request` as input.

The output of the chain should be in JSON format indicating the login status of a user, either `{"is_login" : true}` or `{"is_login" : false}`

By default, the value will be `chains/core/is_login.yaml`

* `group_validation_chain` 

Group validation chain. Require `request` and `groups` (in JSON list format, or string) as input.

The output of the chain should be in JSON format indicating whether the user is part of particular group or not. `{"is_in_group" : true, "groups": ["admin", "employee"]}`

By default, the value will be `chains/core/is_in_group.yaml`

* `route_list_chain` 

Route list chain.

The output of the chain should be routes in JSON format.

By default, the value will be `chains/core/route_list.yaml`

* `current_version_chain` 

By default, the value will be `chains/core/current_version.yaml`

* `update_version_chain` 

By default, the value will be `chains/core/update_version.yaml`


## Current Features (Under development)
The already working features:
* File upload (there but not tested)
* Cookies & Session (both, retrieving and writing are working)
* View template (using pug, ejs, and handlebar)
* Configurations 

![demo](doc/web-framework.png)

# Similar projects, inspirations, and how chimera-framework different from them

* Polyglot (https://github.com/sausheong/polyglot)

    In polyglot, single process flow is written in a single programming language. However, you can have a lot of process flows, which each of them can be written in different languages.

    In chimera-framework, singe process can be divided into several sub-processes. Every sub-process can be written in different language.

* Beaker notebook (http://beakernotebook.com/)

    This one is quite similar to chimera-framework. However, the main purpose of beaker is for prototyping and note-taking. In beaker a cell cannot be used in different notebook. You should copy the cell into another notebook in order to use the same piece of code.

* Invoker (http://dota2.gamepedia.com/Invoker)

    A hard-to-master DOTA hero. Not even a framework. Has cool abilities which are combination of 3 orbs.

* Chimera (https://en.wikipedia.org/wiki/Chimera_(mythology))

    Legendary creature. Combination of goat, lion, and snake.
