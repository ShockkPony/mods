module.exports = function()
{
	this.modules = {};
	this.stack = [];

	this.max_depth = 32;

	this.load = function(module)
	{
		if(typeof module.name !== 'string')
		{
			throw new Error('module.name must be string');
			return;
		}

		if(this.modules[module.name] !== undefined)
		{
			throw new Error('module.name already exists');
			return;
		}

		this.modules[module.name] = module;

		var args = ['$load', module.name].concat(Array.prototype.slice.call(arguments, 1));
		this.fire.apply(this, args);
	}

	this.unload = function(name)
	{
		if(this.modules[name] === undefined)
		{
			throw new Error('name does not exist');
			return;
		}

		var args = ['$unload', name].concat(Array.prototype.slice.call(arguments, 1));
		this.fire.apply(this, args);

		this.modules[name] = undefined;
	}

	// event_name, [params...]
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

	// target_module, event_name, [params...]
	this.target = function(target_module, event_name)
	{
		var ret = undefined;

		var params = Array.prototype.slice.call(arguments, 2);

		if(this.stack.length >= this.max_depth)
		{
			throw new Error('max depth exceeded');
			return;
		}

		if(typeof target_module !== 'string')
		{
			throw new Error('target module must be string');
			return;
		}

		if(typeof event_name !== 'string')
		{
			throw new Error('event name must be string');
			return;
		}

		var active_module = this.stack[this.stack.length - 1];

		var s = event_name.split('$');
		if(s.length > 1)
		{
			active_module = s[0];
			event_name = s[1];
		}

		if(active_module === undefined) active_module = '';
		var sender = this.modules[active_module];

		if(typeof this.modules[target_module][active_module + '$' + event_name] === 'function')
		{
			this.stack.push(target_module);

			try
			{
				this.modules[target_module].mods = this;
				this.modules[target_module].sender = sender;
				ret = this.modules[target_module][active_module + '$' + event_name].apply(this.modules[target_module], params);
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
