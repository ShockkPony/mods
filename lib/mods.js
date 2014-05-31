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
	this.modules = {};
	this.stack = [];

	this.max_depth = 32;

	this.load = function(module, name, reload)
	{
		if(typeof module === 'string')
		{
			var resolved = undefined
			try
			{
				resolved = require.resolve(module);
			}
			catch(e)
			{
				resolved = require.resolve(process.cwd() + '/' + module);
			}

			delete require.cache[resolved];
			module = require(resolved);
		}

		if(typeof module !== 'object')
			throw new exports.Error('module must be object or resolve to object', 'type');

		if(name !== undefined)
			module.name = name;

		if(typeof module.name !== 'string')
			throw new exports.Error('module.name must be string', 'type');

		if(this.modules[module.name] !== undefined)
		{
			if(reload !== true)
				throw new exports.Error('module.name already exists', 'exists');
			else
			{
				var doReload = true;
				var state = this.target(module.name, '$suspend');
				this.fire('$unload', module.name);
			}
		}

		this.modules[module.name] = module;

		var args = ['$load', module.name].concat(Array.prototype.slice.call(arguments, 3));
		this.fire.apply(this, args);

		if(doReload === true) this.target(module.name, '$resume', state);
	}

	this.unload = function(name)
	{
		if(this.modules[name] === undefined)
			throw new exports.Error('name does not exist', 'notexists');

		var args = ['$unload', name].concat(Array.prototype.slice.call(arguments, 1));
		this.fire.apply(this, args);

		this.modules[name] = undefined;
		delete this.modules[name];
	}

	/* event_name, [params...] */
	this.fire = function(event_name)
	{
		var ret = {};

		var params = Array.prototype.slice.call(arguments, 1);

		for(var module in this.modules)
		{
			var args = [module, event_name].concat(params);
			ret[module] = this.target.apply(this, args);
		}

		return ret;
	}

	/* target_module, event_name, [params...] */
	this.target = function(target_module, event_name)
	{
		var ret = undefined;

		var params = Array.prototype.slice.call(arguments, 2);

		if(this.stack.length >= this.max_depth)
			throw new exports.Error('max depth exceeded', 'resource');

		if(typeof target_module !== 'string')
			throw new exports.Error('target module name must be string', 'type');

		if(typeof event_name !== 'string')
			throw new exports.Error('event name must be string', 'type');

		var active_module = this.stack[this.stack.length - 1];

		var s = event_name.split('$');
		if(s.length > 1)
		{
			active_module = s[0];
			event_name = s[1];
		}

		if(active_module === undefined) active_module = '';
		var sender = this.modules[active_module];
		var full_event = active_module + '$' + event_name;

		if(this.modules[target_module] !== undefined && typeof this.modules[target_module][full_event] === 'function')
		{
			this.stack.push(target_module);

			try
			{
				this.modules[target_module].__ = this.modules;
				this.modules[target_module].__mods = this;
				this.modules[target_module].__sender = sender;
				ret = this.modules[target_module][full_event].apply(this.modules[target_module], params);
				this.stack.pop();
			}
			catch(err)
			{
				this.stack.pop();
				throw err;
			}
		}

		return ret;
	}
}

exports.Error = function(msg, type)
{
	var e = new Error(msg);
	e.type = type;
	return e;
}
