<h1 align="center">Chimera-Framework</h1>

<div align="center">
  <img src="logo.png" />
</div>
<br />
<div align="center">
  <strong>Language Agnostic Framework for Stand-alone and Distributed Computing</strong>
</div>
<br />

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![codecov](https://codecov.io/gh/goFrendiAsgard/chimera-framework/branch/master/graph/badge.svg)](https://codecov.io/gh/goFrendiAsgard/chimera-framework)
<a href="https://gitter.im/chimera-framework?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge"><img src="https://badges.gitter.im/Join Chat.svg" alt="Gitter"></a>

Chimera-Framework is a language agnostic framework for standalone and distributed computing. Chimera-Framework is written in `Node.Js`. As a component based software engineering framework, Chimera-Framework allows you to orchestrate several components to achieve a greater goal. The components can be written in any programming language. Even an executable binary file can also serve as component.

You can use [CHIML](https://github.com/goFrendiAsgard/chimera-framework/wiki/CHIML) in order to orchestrate the process. CHIML is a superset of YAML which is also a superset of JSON.

# How it looks like

```yaml
# filename: hi.chiml
ins: name
out: output
do:
  - |date -> today
  - |("Hi ", name, " today is ", today) -> {$.concat} -> output
```

```bash
gofrendi@asgard:~$ date
Mon Feb  5 22:10:37 WIB 2018

gofrendi@asgard:~$ chimera hi.chiml Naomi
Hi Naomi today is Mon Feb  5 22:10:37 WIB 2018
```

# Use Case

The `C++` program (as component)

```c
#include <stdio.h>

// filename: calculate.cpp
// compile: gcc calculate.cpp -o calculate
// execute: ./calculate

int main () {
  float n1, n2;
  char op;
  scanf("%f", &n1);
  scanf(" %c", &op);
  scanf("%f", &n2);
  switch (op) {
    case '+': printf("%f\n", n1 + n2); break;
    case '-': printf("%f\n", n1 - n2); break;
    case '*': printf("%f\n", n1 * n2); break;
    case '/': printf("%f\n", n1 / n2); break;
    default: printf("Invalid operator\n");
  }
  return 0;
}
```

The CHIML orchestration to calculate `(a^2 - b^2)`

```yaml
# filename: trick.chiml
# purpose: calculate (a^2 - b^2)
# math: (a^2 - b^2) = (a + b) * (a - b)
# composition:
#    process 1: c = a + b
#    process 2: d = a - b
#    process 3: result = c * d

ins: a, b
out: result
do:
  - parallel:
    - |(a, '+', b) -> ./calculate -> c
    - |(a, '-', b) -> ./calculate -> d
  - |(c, '*', d) -> ./calculate -> result
```

Calculate `(5^2 - 3^2)`

```bash
gofrendi@asgard:~/Projects$ gcc calculate.cpp -o calculate
gofrendi@asgard:~/Projects$ ./calculate
5
+
7
12.000000
gofrendi@asgard:~/Projects$ chimera trick.chiml 5 3
16
```

# Getting Started

1. Make sure you already have `Node.Js` and `npm` installed. If you don't have them installed yet, you can invoke:

   ```bash
   sudo apt-get install nodejs npm
   ```

2. Install Chimera-Framework by invoking:

   ```bash
   sudo npm install --global chimera-framework
   ```

3. Visit our [wiki](https://github.com/goFrendiAsgard/chimera-framework/wiki/) for more information.

# Examples

* [Stand alone computing](https://github.com/goFrendiAsgard/chimera-framework/wiki/Getting-Started#stand-alone-computing)
* [Distributed computing](https://github.com/goFrendiAsgard/chimera-framework/wiki/Getting-Started#distributed-computing)
* [Creating simple web application](https://github.com/goFrendiAsgard/chimera-framework/wiki/Getting-Started#web-app)
* [Content Management System (CMS)](https://github.com/goFrendiAsgard/chimera-framework/wiki/Content-Management-System-(CMS))

# License
Chimera-Framework is released under the MIT License.

# Citation
If you publish any article related to Chimera-Framework, please cite our paper on [http://ieeexplore.ieee.org/document/8320654/](http://ieeexplore.ieee.org/document/8320654/)
