`Chimera-framework` comes with several CLI utilities

# chimera

## Usage

`chimera <chain> [input1, [input2, [input3, .... [inputN]]]]`

## Description

Execute `chain`, set `stdout` to the output of the `chain`, and put any error/warning into `stderr`

## Example

`chimera add.yaml 5 6`

# chimera-serve

## Usage

`[PORT=<port> [PUBLISHED=<publishedDirectory>]] chimera-serve`

## Example

`PORT=3000 PUBLISHED=. chimera-serve`

Or

`chimera-serve`

## Description

Expose all chain in `publishedDirectory` so that it is accessible by other computers in the network through `chimera-send`

# chimera-send

## Usage

`chimera-send <http[s]://serverAddress:[port]> <remoteChain> [input1, [input2, [input3,... [inputN]]]]`

## Example

`chimera-send http://development.server:3000 add.yaml 5 6`

## Description

Execute `remoteChain` in other computer in the network exposed by `chimera-serve`, set `stdout` to the output of the `chain`, and put any error/warning into `stderr`

# chimera-eisn

## Usage

`chimera-eisn <sourceFile> <destinationFile> <command>`

## Example

`chimera-eisn Substract.java Substract.class javac Substract.java`

## Description

Execute compiing-command if source-code-file's modification time is newer than target-file's modification time

# chimera-init-web

## Usage

`chimera-init-web <projectName>`

## Example

`chimera-init-web myProject`

## Description

Create a new web chimera-web application
