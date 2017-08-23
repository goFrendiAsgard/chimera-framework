# YAML chain Semantic

All chain file should contains single `Root Process`.
The semantic of YAML chain file is written below:

## Root Process

```yaml
vars: [Variable_declaration]
verbose: [Boolean]
[Process]
```

```yaml
[Process]
```

## Boolean

```yaml
true
```

```yaml
false
```

## Variable_declaration

```yaml
[Variable_name] : [Value]
[Variable_name] : [Value]
...
```

## Variable_name

```yaml
[String]
```

## Value

```yaml
[String]
```

## Process

```yaml
ins: [Input]
out: [Output]
mode: [Mode]
chains:
    - [Process]
    - [Process]
    - ...
```

```yaml
ins: [Input]
out: [Output]
series:
    - [Process]
    - [Process]
    - ...
```

```yaml
ins: [Input]
out: [Output]
parallel:
    - [Process]
    - [Process]
    - ...
```

```yaml
ins: [Input]
out: [Output]
command: [Command]
```

```yaml
([Input]) -> [Command] -> [Output]
```

```yaml
([Input]) -> [Command]
```

```yaml
[Command] -> [Output]
```

## Mode

```yaml
series
```

```yaml
parallel
```

## Input

`Input` is comma separated `Value` or `Variable_name`.

```yaml
[Variable_name], [Variable_name], [Variable_name], ...
```

```yaml
"[Value]", "[Value]", "[Value]", ...
```

The combination of `Value` and `Variable_name` is also permitted.

```yaml
[Variable_name], "[Value]", ...
```

## Output

```yaml
[Variable_name]
```

## Command

Any non-interactive command prompt program can be used as `Cmd_command`.
E.g: `cal`, `calc`, `php your-script.php`, `python your-script.py`, `node your-script.js`, etc.

```yaml
Cmd_command
```

Javascript arrow function [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions) can be used as `Command`

```yaml
Javascript_arrow_function
```
