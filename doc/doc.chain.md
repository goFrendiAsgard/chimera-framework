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

```yaml
[Variable_name], [Variable_name], [Variable_name], ...
```


```yaml
"[Value]", "[Value]", "[Value]", ...
```

```yaml
[Variable_name], "[Value]", ...
```

## Output

```yaml
[Variable_name]
```

## Command

```yaml
Cmd_command
```

```yaml
Javascript_arrow_function
```
