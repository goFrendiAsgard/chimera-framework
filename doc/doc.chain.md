# YAML chain Semantic

* Process

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

