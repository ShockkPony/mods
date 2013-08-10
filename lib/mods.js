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
	}

	this.unload = function(name)
	{
		if(this.modules[name] === undefined)
		{
			throw new Error('name does not exist');
			return;
		}

		this.modules[name] = undefined;
	}

	// event_name, [params...]
	this.fire = function(event_name)
	{
		var params = Array.prototype.slice.call(arguments, 1);

		for(var module in this.modules)
		{
			var args = [module, event_name].concat(params);
			this.target.apply(this, args);
		}
	}

	// target_module, event_name, [params...]
	this.target = function(target_module, event_name)
	{
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
				var args = [this, sender].concat(params);
				this.modules[target_module][active_module + '$' + event_name].apply(this.modules[target_module], args);
				this.stack.pop();
			}
			catch(err)
			{
				this.stack.pop();
				throw err;
			}
		}
	}
}
