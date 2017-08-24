# API

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
            Execute a YAML chain, and executing the callback. If callback is empty, then the result will be printed into stdout. See <a href="#executechain">example</a>
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
                <li>result: string, output of the YAML chain</li>
                <li>success: boolean, true if YAML chain yield no error</li>
                <li>errorMessage: string, the error message</li>
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
            Return nanoseconds as formatted number. See <a href="#getFormattedNanoSecond">example</a>
        </td>
    </tr>
    <tr>
        <td><b>deepCopyObject</b></td>
        <td>obj</td>
        <td>
            object to be copied
        </td>
        <td>
            Make a copy of an object. See <a href="#deepCopyObject">example</a>
        </td>
    </tr>
    <tr>
        <td rowspan="2"><b>patchObject</b></td>
        <td>obj</td>
        <td>
            object to be patched
        </td>
        <td rowspan="2">
            Patch an object with patcher. See <a href="#deepCopyObject">example</a>
        </td>
    </tr>
    <tr>
        <td>patcher</td>
        <td>object, the patcher</td>
    </tr>
</table>

# Example

## executeChain
## getFormattedNanoSecond
## deepCopyObject
## patchObject
