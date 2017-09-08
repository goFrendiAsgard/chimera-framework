# MongoDB API

Chimera-framework offer several API you can use in your Node.Js scripts. In order to use the API, you need to import `chimera-framework/mongo-driver`. This API supporting row-versioning automatically

<table>
    <tr>
        <th>Function</th>
        <th>Parameter</th>
        <th>Parameter Description</th>
        <th>Function Description</th>
    </tr>
    <!-- createDbConfig -->
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
        <td rowspan="5">
            <p>
                Creating a dbConfig object, which is required for <code>find</code> <code>insert</code> <code>update</code> <code>remove</code> and <code>permanentRemove</code>
            </p>
            <p>
                If callback is empty, then the created dbConfig will be shown in stdout.
            </p>
        </td>
    </tr>
    <tr>
        <td>obj</td>
        <td>Object with <code>mongo_url</code> key. Instead of literal string, you can pass an object with <code>mongo_url</code> key instead</td>
    </tr>
    <tr>
        <td>collectionName</td>
        <td>string, name of collection</td>
    </tr>
    <tr>
        <td>userId</td>
        <td>string, userId. Used for row versioning to fill up <code>_modified_by</code> column</td>
    </tr>
    <tr>
        <td>callback</td>
        <td>
            callback function, require 3 parameters:
            <ul>
                <li>
                    <b>dbConfig</b>
                    A newly created dbConfig object. This object is required for <code>find</code> <code>insert</code> <code>update</code> <code>remove</code> and <code>permanentRemove</code>
                </li>
                <li>
                    <b>success</b>
                    boolean, contains <code>true</code> if the operation succeed
                </li>
                <li>
                    <b>errorMessage</b>
                    string, error message
                </li>
            </ul>
        </td>
    </tr>
    <!-- closeConnection -->
    <tr>
        <td>
            <b>closeConnection</b><br />
            <code>closeConnection()</code>
        </td>
        <td>-</td>
        <td>-</td>
        <td>Close database connection manually</td>
    </tr>
    <!-- find -->
    <tr>
        <td rowspan="4">
            <b>find</b><br />
            <ul>
                <li><code>find(&lt;dbConfig&gt;, &lt;query&gt;, &lt;projection&gt;, &lt;callback&gt;)</code></li>
                <li><code>find(&lt;dbConfig&gt;, &lt;query&gt;, &lt;callback&gt;)</code></li>
                <li><code>find(&lt;dbConfig&gt;, &lt;callback&gt;)</code></li>
            </ul>
        </td>
        <td></td>
        <td></td>
        <td rowspan="4">
            <p>Get documents based on query and projection</p>
        </td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>callback</td>
        <td>
            callback function, require 3 parameters:
            <ul>
                <li>
                    <b>docs</b>
                    Array of object or an object. If you put primary key value as <code>query</code>, a single object representing the document will be returned, otherwise an array containing list of documents matching the <code>query</code> will be returned
                </li>
                <li>
                    <b>success</b>
                    boolean, contains <code>true</code> if the operation succeed
                </li>
                <li>
                    <b>errorMessage</b>
                    string, error message
                </li>
            </ul>
        </td>
    </tr>
    <!-- insert -->
    <tr>
        <td rowspan="4">
            <b>insert</b><br />
            <code>insert(&lt;dbConfig&gt;, &lt;data&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td rowspan="4"></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>callback</td>
        <td>
            callback function, require 3 parameters:
            <ul>
                <li>
                    <b>docs</b>
                    Array of object or an object. If you put and object as <code>data</code>, a single object representing the inserted document will be returned, otherwise an array containing list of inserted documents will be returned
                </li>
                <li>
                    <b>success</b>
                    boolean, contains <code>true</code> if the operation succeed
                </li>
                <li>
                    <b>errorMessage</b>
                    string, error message
                </li>
            </ul>
        </td>
    </tr>
    <!-- update -->
    <tr>
        <td rowspan="5">
            <b>update</b><br />
            <code>update(&lt;dbConfig&gt;, &lt;query&gt;, &lt;data&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td rowspan="5"></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>callback</td>
        <td>
            callback function, require 3 parameters:
            <ul>
                <li>
                    <b>docs</b>
                    Array of object or an object. If you put and object as <code>data</code>, a single object representing the updated document will be returned, otherwise an array containing list of updated documents will be returned
                </li>
                <li>
                    <b>success</b>
                    boolean, contains <code>true</code> if the operation succeed
                </li>
                <li>
                    <b>errorMessage</b>
                    string, error message
                </li>
            </ul>
        </td>
    </tr>
    <!-- remove -->
    <tr>
        <td rowspan="4">
            <b>remove</b><br />
            <code>remove(&lt;dbConfig&gt;, &lt;query&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td rowspan="4"></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>callback</td>
        <td>
            callback function, require 3 parameters:
            <ul>
                <li>
                    <b>docs</b>
                    Array of object or an object. If you put primary key value as <code>query</code>, a single object representing the document will be returned, otherwise an array containing list of documents matching the <code>query</code> will be returned
                </li>
                <li>
                    <b>success</b>
                    boolean, contains <code>true</code> if the operation succeed
                </li>
                <li>
                    <b>errorMessage</b>
                    string, error message
                </li>
            </ul>
        </td>
    </tr>
    <!-- permanentRemove -->
    <tr>
        <td rowspan="4">
            <b>permanentRemove</b><br />
            <code>permanentRemove(&lt;dbConfig&gt;, &lt;query&gt;, &lt;options&gt;, &lt;callback&gt;)</code>
        </td>
        <td></td>
        <td></td>
        <td rowspan="4"></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td></td>
        <td></td>
    </tr>
    <tr>
        <td>callback</td>
        <td>
            callback function, require 3 parameters:
            <ul>
                <li>
                    <b>result</b>
                    Deletion result object. Typically contains something like <code>{'ok':1, 'n':4}</code> depending on your server version.
                </li>
                <li>
                    <b>success</b>
                    boolean, contains <code>true</code> if the operation succeed
                </li>
                <li>
                    <b>errorMessage</b>
                    string, error message
                </li>
            </ul>
        </td>
    </tr>
</table>

