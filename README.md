# mods

mods is an evented module system for Node.js.

## Usage

### Installation

```
$ npm install mods
```

### Example

##### index.js
```javascript
var mods = new(require('mods'));
var hello = require('./hello');
var bye = require('./bye');

mods.load(hello);
mods.load(bye);

mods.fire('$test');
```

##### hello.js
```javascript
exports.name = 'hello';
exports.$test = function(mods)
{
	console.log('hello --> $test');

	// this will fire `hello$test` which is not hooked so nothing will happen
	mods.fire('test');
}
```

##### bye.js
```javascript
exports.name = 'bye';
exports.$test = function(mods)
{
	console.log('bye --> $test');

	// this will fire `bye$test` which is hooked so it will be called
	mods.fire('test');
}

exports.bye$test = function()
{
	console.log('bye --> bye$test');
}
```

##### Output
```
$ node index
hello -> $test
bye --> $test
bye --> bye$test
```
