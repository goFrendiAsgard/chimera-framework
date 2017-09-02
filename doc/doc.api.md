# API

Chimera-framework offer several API you can use in your Node.Js scripts. In order to use the API, you need to import `chimera-framework/core`.

<table>
    <tr>
        <th>Function</th>
        <th>Parameter</th>
        <th>Parameter Description</th>
        <th>Function Description</th>
    </tr>
    <tr>
        <td rowspan="4"><b>executeChain</b></td>
        <td>chain</td>
        <td>string, YAML chain</td>
        <td rowspan="4">
            Execute a YAML chain, and executing the callback. If callback is empty, then the result will be printed into stdout. See <a href="#executechain">example</a><br /><br />
            <b>Note:</b>For convenience, Chimera change the working directory to the YAML-chain path. At the end of callback stack, the working directory will be set back. However some problem might occurred if you run another code before the callback finished. Also, for a very rare condition (i.e: You accidentally execute interactive program that will wait user-input forever), the callback might not be executed at all.
            </td>
    </tr>
    <tr>
        <td>argv</td>
        <td>Array, YAML chain's input arguments</td>
    </tr>
    <tr>
        <td>presets</td>
        <td>Object, YAML chains's preset variables</td>
    </tr>
    <tr>
        <td>executeCallback</td>
        <td>
            callback function, require 3 parameters
            <ul>
                <li><b>result (stdout)</b>: string, output of the YAML chain</li>
                <li><b>success</b>: boolean, true if YAML chain yield no error</li>
                <li><b>errorMessage (stderr)</b>: string, the error message</li>
            </ul>
        </td>
    </tr>
    <tr>
        <td><b>getFormattedNanoSecond</b></td>
        <td>time</td>
        <td>
            high resolution real time in [seconds, nanoseconds], tuple. Usually result of <i>process.hrtime()</i>
        </td>
        <td>
            Return nanoseconds as formatted number. See <a href="#getformattednanosecond">example</a>
        </td>
    </tr>
    <tr>
        <td><b>deepCopyObject</b></td>
        <td>obj</td>
        <td>
            object to be copied
        </td>
        <td>
            Make a copy of an object. See <a href="#deepcopyobject">example</a>
        </td>
    </tr>
    <tr>
        <td rowspan="2"><b>patchObject</b></td>
        <td>obj</td>
        <td>
            object to be patched
        </td>
        <td rowspan="2">
            Patch an object with patcher. See <a href="#patchobject">example</a>
        </td>
    </tr>
    <tr>
        <td>patcher</td>
        <td>object, the patcher</td>
    </tr>
</table>

# Example

## executeChain

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

## getFormattedNanoSecond

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

## deepCopyObject

```Javascript
const chimera = require('chimera-framework/core');

let a = {x:5, b:7};
let b = a; // b refer to a. So, if b changed, a will be affected as well
let c = chimera.deepCopyObject(a); // c is a copy of a, modification of c will not affect a

a.x = 7;
console.log(a); // {x:7, b:7}
console.log(b); // {x:7, b:7}
console.log(c); // {x:5, b:7}

```

## patchObject
```Javascript
const chimera = require('chimera-framework/core');

let obj = {x:5, b:7};
let patcher = {b:6, c:7};
let newObj = chimera.patchObject(obj, patcher);

console.log(newObj); // {x:5, b:6, c:7}
```
