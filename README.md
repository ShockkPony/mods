# mods

mods is an evented module system for Node.js. Put simply, you throw a bunch of Node.js modules into your mods instance and they can fire events to each other and call each others' methods. Events can be fired globally or to a single target.

## Usage

### Installation

```
$ npm install mods
```

### Example

##### index.js
```javascript
var mods = new(require('mods'))
mods.load(require('./hello'))
mods.load('bye')

var result = mods.fire('$test')
console.log(result)
```

##### hello.js
```javascript
exports.name = 'hello'
exports.$test = function()
{
	console.log('hello --> $test')

	// this will fire `hello$test` which is not hooked so nothing will happen
	this.mods.fire('test')

	return 'result from hello.js'
}
```

##### bye.js
```javascript
exports.name = 'bye'
exports.$test = function()
{
	console.log('bye --> $test')

	// this will fire `bye$test` which is hooked so it will be called
	return this.mods.fire('test')
}

exports.bye$test = function()
{
	console.log('bye --> bye$test')
	return 'result from bye$test in bye.js'
}
```

##### Output
```
$ node index
hello -> $test
bye --> $test
bye --> bye$test
```
