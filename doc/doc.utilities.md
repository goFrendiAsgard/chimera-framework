# Utilities 

Chimera-framework has several CLI utilities

<table>
    <tr>
        <th>Utility</th>
        <th>Usage</th>
        <th>Description</th>
    </tr>
    <tr>
        <td>chimera</td>
        </td>
        <td>
            <code>chimera [yaml-chain] [input1, [input2], [input3],... [inputN]]</code>
        </td>
        <td>
            Executing YAML chain
        </td>
    </tr>
    <tr>
        <td>chimera-serve</td>
        </td>
        <td>
            <code>chimera-serve</code><br />
            Or<br />
            <code>TIMEOUT=[timeout-in-microseconds] PUBLISHED=[published-directory] PORT=[directory] chimera-serve</code>
        </td>
        <td>
            Initiate chimera web service, so that any YAML chain in the current directory will be accessible from the network
        </td>
    </tr>
    <tr>
        <td>chimera-send</td>
        </td>
        <td>
            <code>chimera-send [http(s)://server-address:port] [yaml-chain] [input1, [input2], [input3],... [inputN]]</code>
        </td>
        <td>
            Executing YAML chain remotely. <code>chimera-serve</code> process should be already available in the server.
        </td>
    </tr>
    <tr>
        <td>chimera-eisn</td>
        </td>
        <td>
            <code>chimera-eisn [source-code-file] [target-file] [compiling-command]</code>
        </td>
        <td>
            Execute compiing-command if source-code-file's modification time is newer than target-file's modification time
        </td>
    </tr>
    <tr>
        <td>chimera-init-web</td>
        </td>
        <td>
            <code>chimera-init-web [project-name]</code>
        </td>
        <td>
            Create a chimera web framework project
        </td>
    </tr>
</table>
