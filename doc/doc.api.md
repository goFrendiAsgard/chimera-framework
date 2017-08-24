# API

<table>
    <tr>
        <th>Function</th>
        <th>Parameter</th>
        <th>Parameter Description</th>
        <th>Function Description</th>
    </tr>
    <tr>
        <th rowspan="4">executeChain</th>
        <td>chain</td>
        <td>string, YAML chain</td>
        <td rowspan="4">
            Execute a YAML chain, and executing the callback. If callback is empty, then the result will be printed into stdout.
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
</table>

# Example

## executeChain
## getFormattedNanoSecond
## deepCopyObject
## patchObject
