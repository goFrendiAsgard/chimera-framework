# MongoDB API

Chimera-framework offer several API you can use in your Node.Js scripts. In order to use the API, you need to import `chimera-framework/mongo-driver`. This API supporting row-versioning automatically

<table>
    <tr>
        <th>Function</th>
        <th>Parameter</th>
        <th>Parameter Description</th>
        <th>Function Description</th>
    </tr>
    <tr>
        <td rowspan="5">
            <b>createDbConfig</b><br />
            <ul>
                <li><code>createDbConfig(&lt;mongoUrl&gt;, &lt;collectionName&gt;, &lt;userId&gt;, &lt;callback&gt;)</code></li>
                <li><code>createDbConfig(&lt;obj&gt;, &lt;collectionName&gt;, &lt;userId&gt;, &lt;callback&gt;)</code></li>
            </ul>
        </td>
        <td>mongoUrl</td>
        <td>string, MongoDB connection string (e.g: <code>mongodb://localhost/test</code></td>
        <td rowspan="5"></td>
    </tr>
    <tr>
    </tr>
    <tr>
        <td>
            <b>closeConnection</b><br />
            <code>closeConnection()</code>
        </td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>
            <b>find</b><br />
            <code>find(&lt;dbConfig&gt;, &lt;query&gt;, &lt;projection&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>
            <b>insert</b><br />
            <code>insert(&lt;dbConfig&gt;, &lt;data&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>
            <b>update</b><br />
            <code>update(&lt;dbConfig&gt;, &lt;query&gt;, &lt;data&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>
            <b>remove</b><br />
            <code>remove(&lt;dbConfig&gt;, &lt;query&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>
            <b>permanentRemove</b><br />
            <code>permanentRemove(&lt;dbConfig&gt;, &lt;query&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td></td>
    </tr>
</table>

