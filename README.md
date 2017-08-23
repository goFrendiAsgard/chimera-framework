# Chimera-Framework

Chimera-framework is a language agnostic framework for standalone and distributed computing. Chimera-framework is written in Node.js. As a component based software engineering framework, Chimera-framework allows you to orchestrate several components to achieve a greater goal. Despite of written in `Node.JS`, Chimera-framework let you write your components in any languages (even executable machine language such as linux commands).

# Why Chimera-Framework?

* CLI Support
    Command Line Interface was there since the dawn of UNIX and still relevant today. There are a lot of powerful utilities run on CLI. In Chimera-Framework, you can use them as components of your program. Most programming language also support CLI. Perl, Python, PHP, Ruby, Haskell, Javascript, C, Java, Pascal, R, and even Matlab [http://stackoverflow.com/questions/6657005/matlab-running-an-m-file-from-command-line](http://stackoverflow.com/questions/6657005/matlab-running-an-m-file-from-command-line) are supporting CLI.

* Programming Language Diversity
    Some programming language are good at several cases, while some other are better at other cases. You might love PHP from the bottom of your heart. But when it come to statistic computation, R might be a better bet. By using Chimera, you can make PHP, R, and even CLI utilities work together.

* Less Painful Technology Migration
    New technologies raise, while some others fall. In the world of software development, limitting our knowledge to a single technology is the worst thing to do. Using Chimera-framework, it is possible to build small components that can be swapped or changed any time. Thus, you can replace some components rather than rebuild your system from scratch.

# Installation

Chimera-Framework installation is very easy. First, you need to have `Node.Js` and `npm` installed. Then you can simply perform

```sh
npm install --global chimera-framework
```

Another method to install Chimera-Framework is by using `git`. First, you should make sure you have `git` client installed.
```sh
git clone git@github.com:goFrendiAsgard/chimera.git
npm install
npm link
```

# Dependencies

* Node.Js
* npm
* Interpreters/Compilers, depend on programming language you use.

# Testing 

Chimera-Framework was built with TDD in mind. You can run the test by executing `npm test`. The test require `python`, `php`, and `java` to be already installed.

# Using Chimera-Framework 

To use Chimera-Framework, you need to define YAML chain file. Then you can invoke your process as follow:

```sh
chimera [your-chain-file.yaml] [input1 [input2 [input3 ...]]]
```

The YAML chain file semantic can be found [here](doc/doc.chain-semantic.md)

__Note:__ You can also use JSON Format instead of YAML.

## Basic Example

Suppose we have two simple programs in PHP and Javascript. The task is to perform `(a+b) + (a+b)`.
The task was broken down into several sub processes:

* Process 1 : c = a+b (written in PHP)
* Process 2 : d = a+b (written in PHP)
* Process 3 : e = c+d (written in Javascript)

Process 1 and process 2 would be executed in parallel. After those processes had been executed, process 3 would be started.

To demonstrate language agnosticism, process 1 and process 2 was written in PHP (they have the same source code),while process 3 was written in Javascript. Each programs require two input arguments and return single output. The source code of process 1 and process 2 is presented below: 

```php
<?php
// File Location : tests/add.php
$n1 = $argv[1];
$n2 = $argv[2];
echo $n1 + $n2;
```

While the source code of process 3 is shown below: 

```Javascript
// File Location : tests/add.js
var n1 = parseInt(process.argv[2]) ;
var n2 = parseInt(process.argv[3]) ;
```

In order to assemble the process, we need to build a YAML chain file.  The semantic rule of YAML chain is presented [here](doc/doc.chain-semantic.md)
```yaml
# file location process.yaml
ins: a,b
out: e
series:
  − parallel :
    # Process 1
    − (a,b) −> php tests/add.php −> c
    # Process 2
    − (a,b) −> php tests/add.php −> d
  # Process 3
  − (c,d) −> node tests/add.js −> e
```
The `Root Process` takes two input, (`a`, and `b`) and yield a single output `e`.

Process 1 and process 2 will be done in parallel.

Process 1 takes two inputs (`a` and `b`) and return `c` as output.

Process 2 takes two inputs (`a` and `b`) and return `d` as output.

After Process 1 and Process 2 finished, Process 3 will be executed. Process 3 takes `c` and `d` as output and return `e` as output.

To execute the process, we can invoke:

```sh
chimera process.yaml 4 5
```

The output should be `18` as `(4+5) + (4+5) = 18`.


## Distributed Process

In the previous example, the sub-processes (Process 1, Process 2, and Process 3) was executed in a single computer. Chimera-framework can also run in distributed scenario. Suppose Process 1 should be run in the server, and Process 2 should run in the client, we should divide the process into 4 steps.

Before we dive into the steps, we should prepare two more files.

```yaml
# server.yaml
(a , b) −> php tests/add.php −> c
```

`server.yaml` contains only a single process (`tests/add.php`). It takes `a` and `b` as inputs, and return `c` as output. Executing `chimera server.yaml 4 5` will return `9`.

```yaml
# process.yaml
ins: a, b, server
out: e
verbose : true
series :
    − parallel :
        # Process 1
        − (server, 'server.yaml', a, b)−> chimera−send −> c 
        # Process 2
        − (a, b) −> php programs/add.php −> c
    # Process 3 
    − (c, d) −> node programs/add.js −> e
```

This YAML chain file is basically similar to our previous example. The only difference is on Process 1 definition. This process takes 4 inputs. The first one is server address, the second one is server's YAML chain, and the last two inputs will be sent `server.yaml`'.

`chimera-send` is a utility to execute YAML chain file in other computer. Its first two parameters are `server address` and `server YAML chain file` respectively.

After preparing the files, we should proceed with these 4 steps:


* __Server side preparation__: In the server side, we need to provide:
    - `tests/add.php`
    - `server.yaml`

* __Server side execution__: After server preparation completed, we need to serve `server.yaml`, so that it is accessible from the network. In order to do this, we can execute `chimera-serve`, a utility to serve chains in the server:

```sh
chimera-serve
```

* __Client side preparation__: In the client side, we need to provide:
    - `tests/add.php`
    - `tests/add.js`
    - `process.yaml`

* __Client side execution__: After client preparation completed, we can then execute:

```sh
chimera process.yaml 4 5
```

## Shorthand

Let's look at this example:

```yaml
# filename: add.yaml
ins: a, b
out: c
command: node add.js
```

You can invoke the chain by performing `chimera add.yaml 5 6`. Assuming you `add.js` works correctly, you should see `11` as result.
If you don't define `out` element, `_ans` will be used by default.

Chimera also provide some shorthand for your convenience. The above example can also be written as:


```yaml
# Now, we put ins and out into the command, separated by ->
# The format is: [input] -> [process] -> output
command: (a,b) -> node add.js -> c
```

if not specified, the out parameter is default to `_ans`

```yaml
ins: a, b
command: node add.js
```

You can also write the process as:
```yaml
command: (a, b) -> node add.js
```

or even:

```yaml
(a, b) -> node add.js
```

In some situation, your process might be so simple that you only need a single line javascript arrow function instead of a fully stand alone program. In that case, you can do this:

```yaml
(a, b) -> (x,y)=>{return parseFloat(x)+parseFloat(y)}
```

For more comprehensive information regarding anonymous javascript arrow function, please visit [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)

## Process control (branch and loop)

Sometime your process contains several simple logic (i.e: loop and branch). Please look at this example:

```yaml
# control.yaml
vars : 
    delta : 1
ins : a
out : a
series :
  # First process
  - if : a < 10
    command : (a, delta) -> node programs/add.js -> a
    while : a < 8
  # Second process
  - if : a > 10
    command : (a, delta) -> node programs/substract.js -> a
```

In the example, we create a global variable named `delta`. The value is `1`. It can be changed later by the processes. But, for this example, we won't do any changes to `delta`'s value. Instead, we will change the value of `a`

We have two proceesses that run sequentially (you can also use `parallel` instead of `series`, it will be discussed in the next section).

The first process (`(a, delta) -> node programs/add.js -> a`) take `a` and `delta` as inputs. The output will then saved in global variable `a`, so that it can be used later. Chimera will execute this process only if `a < 10`. The process will then executed repeatedly while `a < 8`

Once the first process completed (or ignored in case of the initial condition unmet), the second process (`(a, delta) -> node programs/substract.js -> a`) will be executed. The second process will only be executed if `a > 10`.

The process above is logically equal to this pseudo-code (well, actually this is Python):

```python
delta = 1
a = input()

# First process
if a < 10:
    # Well, it is actually do-while,
    # Python just strangely doesn't have do-while
    # so here we go...
    while True:
        a = read_output_of('node programs/add.js ' + a + ' ' + delta)
        if not (a<8):
            break

# Second process
if a > 10:
    a = read_output_of('node programs/substract.js ' + a + ' ' + delta)

# now, show the output
print a
```

__Note:__ Use this feature with care. Don't over do it. For a more complex logic-control, please put it on your program.

## Nested variables

The best and worst part of Javascript object is that you can add any key without any need to define structure. Chimera's global variable is actually a big javascript object.

Suppose you have variable `a`, you can then access `a.name`, `a.address` etc.

The following YAML file show you how a nested variable can be used.

```yaml
ins: a, b
out: c
vars:
    tmp: 
        x: 3
        z: 5
verbose: false
series:
    - echo "{\"x\":4, \"y\":{}}" -> tmp
    - parallel:
        - series: 
            - (a, b) -> node programs/add.js -> tmp.y.addResult
            - (tmp.y.addResult, tmp.x) -> php programs/multiply.php -> tmp.y.addResult
        - series:
            - (a, b) -> node programs/substract.js -> tmp.y.substractResult
            - (tmp.y.substractResult, tmp.x) -> php programs/multiply.php -> tmp.y.substractResult
    - (tmp.y.addResult, tmp.y.substractResult) -> php programs/multiply.php -> c
```
Please observe each state of the program

```sh
gofrendi@minastirith:~/chimera$ chimera tests/chain-complex-vars.yaml 10 11
[INFO] START PROCESS [php programs/echo.php "{\"x\":4, \"y\":{}}"] AT    : 57,939,071,995,102
[INFO] END PROCESS   [php programs/echo.php "{\"x\":4, \"y\":{}}"] AT    : 57,939,119,742,255
[INFO] PROCESS       [php programs/echo.php "{\"x\":4, \"y\":{}}"] TAKES : 47,689,756 NS
[INFO] STATE AFTER   [php programs/echo.php "{\"x\":4, \"y\":{}}"]       : {"tmp":{"x":4,"y":{}},"a":10,"b":11}
[INFO] START PROCESS [php programs/add.php "10" "11"] AT    : 57,939,122,782,058
[INFO] START PROCESS [php programs/substract.php "10" "11"] AT    : 57,939,125,628,701
[INFO] END PROCESS   [php programs/add.php "10" "11"] AT    : 57,939,155,653,704
[INFO] PROCESS       [php programs/add.php "10" "11"] TAKES : 32,833,697 NS
[INFO] STATE AFTER   [php programs/add.php "10" "11"]       : {"tmp":{"x":4,"y":{"addResult":21}},"a":10,"b":11}
[INFO] START PROCESS [php programs/multiply.php "21" "4"] AT    : 57,939,156,339,845
[INFO] END PROCESS   [php programs/substract.php "10" "11"] AT    : 57,939,158,555,972
[INFO] PROCESS       [php programs/substract.php "10" "11"] TAKES : 32,884,663 NS
[INFO] STATE AFTER   [php programs/substract.php "10" "11"]       : {"tmp":{"x":4,"y":{"addResult":21,"substractResult":-1}},"a":10,"b":11}
[INFO] START PROCESS [php programs/multiply.php "-1" "4"] AT    : 57,939,159,097,322
[INFO] END PROCESS   [php programs/multiply.php "21" "4"] AT    : 57,939,190,612,102
[INFO] PROCESS       [php programs/multiply.php "21" "4"] TAKES : 34,214,893 NS
[INFO] STATE AFTER   [php programs/multiply.php "21" "4"]       : {"tmp":{"x":4,"y":{"addResult":84,"substractResult":-1}},"a":10,"b":11}
[INFO] END PROCESS   [php programs/multiply.php "-1" "4"] AT    : 57,939,192,968,186
[INFO] PROCESS       [php programs/multiply.php "-1" "4"] TAKES : 33,867,169 NS
[INFO] STATE AFTER   [php programs/multiply.php "-1" "4"]       : {"tmp":{"x":4,"y":{"addResult":84,"substractResult":-4}},"a":10,"b":11}
[INFO] START PROCESS [php programs/multiply.php "84" "-4"] AT    : 57,939,193,351,485
[INFO] END PROCESS   [php programs/multiply.php "84" "-4"] AT    : 57,939,223,041,934
[INFO] PROCESS       [php programs/multiply.php "84" "-4"] TAKES : 29,685,070 NS
[INFO] STATE AFTER   [php programs/multiply.php "84" "-4"]       : {"tmp":{"x":4,"y":{"addResult":84,"substractResult":-4}},"a":10,"b":11,"c":-336}
-336
```

## Put YAML-chain format as argument 

You can also put your YAML content directly as argument.

```sh
chimera "command : cal"
```
or simply

```sh
chimera "cal"
```
or even

```sh
chimera "(a) -> cal" 2017
```

which is similar to

```sh
chimera "cal 2017"
```

# API 

```javascript
const chimera = require('chimera-framework/core');

// without presets
chimera.executeChain('your-chain', [5, 1], {}, function(output){
    console.log(output);
});


// with presets
chimera.executeChain('your-chain', {}, {a: 5, b: 1}, function(output){
    console.log(output);
});
```

Function `executeChain` has 4 parameters, `executeChain(yamlFile, inputs, presets, callback)`

* `your-chain` : A string or a file. YAML or JSON format are both valid. 
* `inputs` : Array of inputs
* `presets` : Initial values of variables
* `callback` : Callback function. Require three parameters `output`, `success`, `errorMessage`.
    - `output` contains output of the chain
    - `success` contains whether true or false, reflecting whether the chain executed successfully or with error
    - `errorMessage` contains useful error message for debugging purpose

__Note:__ For convenience, Chimera change the working directory to the YAML-chain path. At the end of callback stack, the working directory will be set back. However some problem might occurred if you run another code before the callback finished. Also, for a very rare condition (i.e: You accidentally execute interactive program that will wait user-input forever), the callback might not be executed at all.

# Web Service

Chimera web service will let you run chains in other computer.

To start a chimera web service, you can run `chimera-serve` in the server.

While to use the web service, you can run `chimera-send http://server.com:3000 chain-file.yaml your-first-input your-second-input`.

You can also define TIMEOUT and PUBLISHED directory when running `chimera-serve`. In Unix, you can do this: `TIMEOUT=5000 PUBLISHED=. chimera-serve` to start the web service that only allows client to access chains in current directory. The maximum execution process should be 5000 ms. Otherwise, a request time out will be returned.

Similar mechanism also works when you run `chimera-send`. `TIMEOUT=1000 chimera-send tests/chain-minimal.yaml 4 4` will make the process only waits for maximum 1 second response from server.

# Utilities

* `chimera-serve` : Look at web service section
* `chimera-send` : Look at web service section
* `chimera-eisn` : Execute if source newer, example: `chimera-eisn program.java program.class javac program.java`

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
  ▾ chains/
    ▾ programs/
        sample.responder.py
      core.auth.yaml
      core.configs.yaml
      core.login.yaml
      core.logout.yaml
      core.routes.yaml
      index.yaml
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
      sample.respond.pug
      sample.ejs
      sample.pug
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

* `route_chain` 

Route list chain.

The output of the chain should be routes in JSON format.

By default, the value will be `chains/core.routes.yaml`

* `config_chain` 

Config list chain.

The output of the chain should be configs in JSON format.

By default, the value will be `chains/core.configs.yaml`

* `auth_chain` 

Authorization chain, require request.

The output of the chain should be user info in JSON format.

By default, the value will be `chains/core.auth.yaml`

* `migration_chain` 

Migration chain, require config.

The output of the chain should be migration info in JSON format.

By default, the value will be `chains/core.migration.yaml`


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
