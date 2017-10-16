# Core API

Chimera-framework offer API you can use in your Node.Js scripts. In order to use the API, you need to import `chimera-framework/core` or `chimera-framework/eisn`.

# executeChain

Execute a YAML chain, and executing the callback. If callback is empty, then the result will be printed into stdout.

## Usage
* `executeChain(<YAML chain>, <callback>)`
* `executeChain(<YAML chain>, <argv>, <callback>)`
* `executeChain(<YAML chain>, <argv>, <presets>, <callback>)`

## Parameters
* `YAML chain`: string, YAML chain
* `argv`: array, YAML chain's input arguments
* `presets`: object, YAML chains's pre-defined variables
* `callback`: callback function, require 3 parameters
    - __result (stdout)__: string, output of the YAML chain
    - __success__: boolean, true if YAML chain yield no error
    - __errorMessage (stderr)__: string, the error message

## Example

```Javascript
const chimera = require('chimera-framework/core');

// without presets
chimera.executeChain('your-chain.yaml', [5, 1], {}, function(result, success, errorMessage){
    if(success){
        // no error
        console.log(result);
    }
    else{
        // error
        console.error(errorMessage);
    }
});


// with presets
chimera.executeChain('your-chain.yaml', {}, {a: 5, b: 1}, function(result, success, errorMessage){
    if(success){
        // no error
        console.log(result);
    }
    else{
        // error
        console.error(errorMessage);
    }
});
```

# getFormattedNanoSecond

Return nanoseconds as formatted number. See <a href="#getformattednanosecond">example</a>

## Usage
* `getFormattedNanoSecond(<time>)`

## Parameters

* `time` high resolution real time in [seconds, nanoseconds], tuple. Usually result of `process.hrtime()`

## Example

```Javascript
const chimera = require('chimera-framework/core');

// Show current time

let formattedTime = chimera.getFormattedNanoSecond(process.hrtime());
console.log(formattedTime); // output example: 13,190,703,346,683


// Benchmarking

let startTime = process.hrtime();
// do a process we want to benchmark
let a = 5+7;
let elapsedTime = process.hrtime(startTime);
// show the elapsed time in formatted nano seconds
console.log(chimera.getFormattedNanoSecond(elapsedTime));
```

# getDeepCopiedObjectObject

Make a copy of an object.

## Usage
* `getDeepCopiedObjectObject(<obj>)`

## Parameters
* `obj`: object to be copied

## Example

```Javascript
const chimera = require('chimera-framework/core');

let a = {x:5, b:7};
let b = a; // b refer to a. So, if b changed, a will be affected as well
let c = chimera.getDeepCopiedObjectObject(a); // c is a copy of a, modification of c will not affect a

a.x = 7;
console.log(a); // {x:7, b:7}
console.log(b); // {x:7, b:7}
console.log(c); // {x:5, b:7}

```

# getPatchedObject

Patch an object with patcher.

## Usage
* `getPatchedObject(<obj>, <patcher>)`

## Parameters
* `obj`: object to be patched
* `patcher`: the patcher

## Example

```Javascript
const chimera = require('chimera-framework/core');

let obj = {x:5, b:7};
let patcher = {b:6, c:7};
let newObj = chimera.getPatchedObject(obj, patcher);

console.log(newObj); // {x:5, b:6, c:7}
```

# eisn
Execute command if source-file is newer than dst-file. Execute the callback whether the command executed or not

## Usage
* `eisn(<src-file>, <dst-file>, <command>, <callback>)`

## Parameters
* `src-file`: string, name of source file
* `dst-file`: string, name of destination file
* `command`: string, command to be executed
* `callback`: callback function, require 3 parameters
    - __result__: object, either `{is_command_executed:true}` or `{is_command_executed:false}`
    - __success__: boolean, true if no error encountered 
    - __errorMessage (stderr)__: string, the error message

## Example
```Javascript
const chimera = require('chimera-framework/core');
chimera.eisn('programs/Substract.java', 'programs/Substract.class', 'javac programs/Substract.java', function(result, success, errorMessage){
    if(!error){
        console.log(JSON.stringify(result));
    }
    else{
        console.error(errorMessage);
    }
});
```

# cmd.run

Execute a shell command asynchronously

## Usage
* `cmd.run(<command>, <options>)`
* `cmd.run(<command>)`

## Parameters
* `command`: string, command to be executed
* `options`: object, the options, see [https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback) for more information

## Example

```Javascript
const chimera = require('chimera-framework/core');
chimera.cmd.run('cp a.txt b.txt');
```

# cmd.get

Execute a shell command asynchronously, and run the callback

## Usage
* `cmd.run(<command>, <options>, <callback>)`
* `cmd.run(<command>, <callback>)`

## Parameters
* `command`: string, command to be executed
* `options`: object, the options, see [https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback) for more information
* `callback`: callback function, require 3 parameters
    - __error__: Javascript Error
    - __result (stdout)__: string, output of the YAML chain
    - __errorMessage (stderr)__: string, the error message

## Example

```Javascript
const chimera = require('chimera-framework/core');
chimera.cmd.get('ls', function(error, stdout, stderr){
    if(!error){
        console.log(stdout);
    }
    else{
        console.error(stderr);
    }
})
```

# util.sprout
Execute `executeChain` without creating new shell

## Usage
* `util.sprout(<path>, <chain>, <input1>, <input2>,... <inputN>, <callback>)`
* `util.sprout(<path>, <chain>, <callback>)`
* `util.sprout(<path>, <chain>, <callback>)`

## Parameters
* `path`: string, path to the chain file location, should be ended with `/`
* `chain`: chain file name
* `input1`, `input2`,... `inputN`: any, process's input
* `callback`: callback function, require 3 parameters
    - __result (stdout)__: string, output of the YAML chain
    - __success__: boolean, true if YAML chain yield no error
    - __errorMessage (stderr)__: string, the error message

## Example
```Javascript

chimera.executeChain('/home/your-user/', 'your-chain.yaml', 5, 1, function(result, success, errorMessage){
    if(success){
        // no error
        console.log(result);
    }
    else{
        // error
        console.error(errorMessage);
    }
});
```
