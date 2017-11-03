<h1 align="center">Chimera-Framework</h1>

<div align="center">
  <img src="other/logo.png" />
</div>
<br />
<div align="center">
  <strong>Language Agnostic Framework for Stand-alone and Distributed Computing</strong>
</div>
<br />

[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![codecov](https://codecov.io/gh/goFrendiAsgard/chimera-framework/branch/master/graph/badge.svg)](https://codecov.io/gh/goFrendiAsgard/chimera-framework)

Chimera-framework is a language agnostic framework for standalone and distributed computing. Chimera-framework is written in `Node.Js`. As a component based software engineering framework, Chimera-framework allows you to orchestrate several components to achieve a greater goal. The components can be written in any programming language. Executable binary file can also act as component.

# Why Chimera-Framework?

* __Programming Language Diversity__ Some programming language are good at machine learning. Some others are good at statistics or web development. Creating a website with some machine-learning/statistics feature will lead you to a soon-to-be-regret decision. Chimera-framework solve this by let you choose the best programming language for each task.

* __CLI Support in Most Programming Language__ Most programming language supporting command line interface. So, rather than inventing a new bridging interface, Chimera-framework simply use this already-popular-and-common interface. Thus, you don't need to learn something new in order to write your component.

* __Technology Migration in Tight Deadline is Painful__ In software development, there is one single hell named vendor-lock. And to make it worse, some frameworks (or even programming languages) can suddenly fade away from the market. Chimera-framework help you prevent this by let you develop component-based software. So, if your components suddenly doesn't work due to deprecation or anything, you can just simply drop in a new replacement without any need to rewrite the entire software.

# Installation

Using npm (You should have `Node.Js` and `npm` installed):
```sh
npm install --global chimera-framework
```
This method is recommended for framework user

Using git (You should have `Node.Js`, `npm`, and `git client` installed):
```sh
git clone git@github.com:goFrendiAsgard/chimera-framework.git
cd chimera-framework
npm install --global
npm link
```
This method is recommended for framework tester/developer

# Update

Using npm:
```
npm update --global chimera-framework
```

Using git
```sh
cd chimera-frameowork
git pull origin master
npm install --global
npm link
```

# Dependencies

* Node.Js
* npm
* Interpreters/Compilers, depend on programming language you use.

# Testing

To perform the test, you can invoke `npm test`. A `g++` compiler is required for some test-case.

# Example

## Stand-Alone-Computing



## Distributed-Computing
