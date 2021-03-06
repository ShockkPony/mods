/*
 *  Copyright 2013-2014 David Farrell <shokku.ra@gmail.com>
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

module.exports = function()
{
	this.modules = {}
	this.instances = {}
	this.instance = null
	this.stack = []
	this.maxDepth = 32

	this.firstAvailableInstanceID = function()
	{
		for(var id=0; this.instances[id]!==undefined; ++id) {}
		return id
	}

	this.newInstance = function(id)
	{
		if(this.instances[id] === undefined)
		{
			id = id || this.firstAvailableInstanceID()
			this.instances[id] = {my:{}}
		}
		return id
	}

	this.deleteInstance = function(id)
	{
		var inst = this.instances[id]
		delete this.instances[id]
		return inst
	}

	this.load = function(module, name, reload)
	{
		if(typeof module === 'string')
		{
			var resolved = undefined
			try
			{
				resolved = require.resolve(module)
			}
			catch(e)
			{
				resolved = require.resolve(process.cwd() + '/' + module)
			}

			delete require.cache[resolved]
			module = require(resolved)
		}

		if(typeof module !== 'object')
			throw new exports.Error('module must be object or resolve to object', 'type')

		if(name !== undefined)
			module.name = name

		if(typeof module.name !== 'string')
			throw new exports.Error('module.name must be string', 'type')

		if(this.modules[module.name] !== undefined)
		{
			if(reload !== true)
				throw new exports.Error('module.name already exists', 'exists')
			else
			{
				var doReload = true
				var state = this.target(module.name, '$suspend')
				this.fire('$unload', module.name)
			}
		}

		module.__mods = this
		module.mods = this
		this.modules[module.name] = module

		var args = ['$load', module.name].concat(Array.prototype.slice.call(arguments, 3))
		this.fire.apply(this, args)

		if(doReload === true) this.target(module.name, '$resume', state)
	}

	this.unload = function(name)
	{
		if(this.modules[name] === undefined)
			throw new exports.Error('name does not exist', 'notexists')

		var args = ['$unload', name].concat(Array.prototype.slice.call(arguments, 1))
		this.fire.apply(this, args)

		this.modules[name] = undefined
		delete this.modules[name]
	}

	/* event_name, [params...] */
	this.fire = function(event_name)
	{
		var params = Array.prototype.slice.call(arguments, 1)

		var sorted = []
		for(var m in this.modules)
			sorted.push(m)
		sorted.sort(function(m1, m2)
		{
			var a = this.modules[m1], b = this.modules[m2]
			if(typeof a.priority !== 'number') a.priority = 0
			if(typeof b.priority !== 'number') b.priority = 0
			if     (a.priority < b.priority) return -1
			else if(a.priority > b.priority) return  1
			else return 0
		}.bind(this))

		var ret = {_a:[]}
		this.break = false

		var len = sorted.length
		for(var i=0; i<len && !this.break; ++i)
		{
			var args = [sorted[i], event_name].concat(params)
			var r = this.target.apply(this, args)
			if(r !== undefined)
			{
				ret[sorted[i]] = r
				ret._a.push(r)
			}
		}

		this.break = false

		return ret
	}

	/* target_module, event_name, [params...] */
	this.target = function(target_module, event_name)
	{
		var params = Array.prototype.slice.call(arguments, 2)

		if(this.stack.length >= this.maxDepth)
			throw new exports.Error('max depth exceeded', 'resource')

		if(typeof target_module !== 'string')
			throw new exports.Error('target module name must be string', 'type')

		if(typeof event_name !== 'string')
			throw new exports.Error('event name must be string', 'type')

		var active_module = this.stack[this.stack.length - 1]

		var s = event_name.split('$')
		if(s.length > 1)
		{
			active_module = s[0]
			event_name = s[1]
		}

		if(active_module === undefined) active_module = ''
		var sender = this.modules[active_module]
		var full_event = active_module + '$' + event_name

		var ret = undefined
		if(this.modules[target_module] !== undefined && typeof this.modules[target_module][full_event] === 'function')
		{
			this.stack.push(target_module)

			try
			{
				this.modules[target_module].instance = this.instances[this.instance] || null
				if(this.instances[this.instance])
				{
					if(this.instances[this.instance].my[target_module] === undefined)
						this.instances[this.instance].my[target_module] = {}
					this.modules[target_module].my = this.instances[this.instance].my[target_module]
				}

				this.modules[target_module].__ = this.modules
				this.modules[target_module].__sender = sender
				ret = this.modules[target_module][full_event].apply(this.modules[target_module], params)
				this.stack.pop()
			}
			catch(err)
			{
				this.stack.pop()
				throw err
			}
		}

		return ret
	}

	/* duplicate code across target and call is required
	 * target cannot chain-call call as it handles active_module in a different
	 * way - namely it allows it to be set explicitly through the event name
	 */

	/* target_module, method_name, [params...] */
	this.call = function(target_module, method_name)
	{
		var params = Array.prototype.slice.call(arguments, 2)

		if(this.stack.length >= this.maxDepth)
			throw new exports.Error('max depth exceeded', 'resource')

		if(typeof target_module !== 'string')
			throw new exports.Error('target module name must be string', 'type')

		if(typeof method_name !== 'string')
			throw new exports.Error('method name must be string', 'type')

		var active_module = this.stack[this.stack.length - 1]
		if(active_module === undefined) active_module = ''
		var sender = this.modules[active_module]

		var ret = undefined
		if(this.modules[target_module] !== undefined && typeof this.modules[target_module][method_name] === 'function')
		{
			this.stack.push(target_module)

			try
			{
				this.modules[target_module].instance = this.instances[this.instance] || null
				if(this.instances[this.instance])
				{
					if(this.instances[this.instance].my[target_module] === undefined)
						this.instances[this.instance].my[target_module] = {}
					this.modules[target_module].my = this.instances[this.instance].my[target_module]
				}

				this.modules[target_module].__ = this.modules
				this.modules[target_module].__sender = sender
				ret = this.modules[target_module][method_name].apply(this.modules[target_module], params)
				this.stack.pop()
			}
			catch(err)
			{
				this.stack.pop()
				throw err
			}
		}

		return ret
	}

	this.reloadSelf = function()
	{
		var old = this
		setImmediate(function()
		{
			delete require.cache[__filename]
			var mods = new(require(__filename))
			mods.modules = old.modules
			for(var k in mods.modules)
			{
				mods.modules[k].__mods = mods
				mods.modules[k].mods = mods
			}
			mods.instances = old.instances
			mods.instance = old.instance
		})
	}
}

exports.Error = function(msg, type)
{
	var e = new Error(msg)
	e.type = type
	return e
}
