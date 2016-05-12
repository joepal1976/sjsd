var fs = require('fs');
var S = require('string');
var _ = require('underscore');

/**
 * This is the code parser class. It is responsible for reading and parsing javascript files
 * in order to create a JSON structure which can then be fed through the templates.
 * 
 * @class Parser
 * @memberof SJSD
 */
var Parser = function(config)
{	
	this.config = config;
	
	this.rawSourceString = "";

	this.namespaces = {};
	this.modules = {};
	this.entities = {};
	this.functions = {};
	this.properties = {};

	// Highest found level in order namespace, module, entity, function
	this.topLevel = "function";

	this.parseTree = {};
	
	this.nodesByName = {};		
};

/**
 * Write a debug message to the console if debug is enabled.
 * @function debug
 * @param message string What to write to the console
 * @memberof SJSD.Parser
 */
Parser.prototype.debug = function(message)
{
	if(this.config.debug)
	{
		console.log(message);
	}
};

/**
 * Write a debug message to the console if spam is enabled.
 * @function spam
 * @param message string What to write to the console
 * @memberof SJSD.Parser
 */
Parser.prototype.spam = function(message)
{
	if(this.config.spam)
	{
		console.log(message);
	}
};

/**
 * Read a javascript source file and add its contents to the list of what should
 * be search for doc strings.
 * 
 * @function addFile
 * @param fileName string the file (including path) to be read and added.
 * @returns The Parser object the method was called on
 * @memberof SJSD.Parser
 */
Parser.prototype.addFile = function(fileName)
{
	this.debug("Add file: " + fileName);

	var contents = fs.readFileSync(fileName, 'utf8');

	this.rawSourceString = this.rawSourceString + contents;
};

/**
 * Parse a comment block into a JSON a structure.
 * 
 * @function parseBlock
 * @param block string a string with the contents of the comment block.
 * @returns The Parser object the method was called on
 * @memberof SJSD.Parser
 */
Parser.prototype.parseBlock = function(block)
{
	if(block === null)
	{
		console.log("ERROR: tried to parse null block");
		process.exit(1);
	}
	
	this.spam("About to parse a block with the following contents:\n\n" + block + "\n\n");
	
	var whiteSpaceProtected = S(block).replaceAll("\n","\x01").s;
	
	var codeReplacer = function(match, contents, offset, s)
    {
		var ret = S(match).replaceAll(" ","\x02").s;
		ret = ret.replace(/^\x01/,"");
		ret = S(ret).replaceAll("\x01","\x03").s;
		ret = ret.replace("</code>","\x03</code>");		
		ret = S(ret).replaceAll("<code>","").s;
		ret = S(ret).replaceAll("</code>","").s;
		ret = S(ret).replaceAll("<","&lt;").s;
		ret = S(ret).replaceAll(">","&gt;").s;		
        return "<code>" + ret + "</code>";
    };

	var preReplacer = function(match, contents, offset, s)
    {
		var ret = S(match).replaceAll(" ","\x02").s;
		ret = ret.replace(/^\x01/,"");
		ret = S(ret).replaceAll("\x01","\x03").s;				
		ret = S(ret).replaceAll("<pre>","").s;
		ret = S(ret).replaceAll("</pre>","").s;
		ret = S(ret).replaceAll("<","&lt;").s;
		ret = S(ret).replaceAll(">","&gt;").s;		
        return "<pre>" + ret + "</pre>";
    };

	whiteSpaceProtected = whiteSpaceProtected.replace(/<code>(.*?)<\/code>/g,codeReplacer);
	whiteSpaceProtected = whiteSpaceProtected.replace(/<pre>(.*?)<\/pre>/g,preReplacer);
	whiteSpaceProtected = S(whiteSpaceProtected).replaceAll("\x01","\n").s;

	this.spam("Block after white space protection:\n\n" + whiteSpaceProtected);
	
	var lines = whiteSpaceProtected.split("\n");

	/**
	 * The DocNode hash represents the JSON structure after parsing a comment block.
	 * 
	 * @entity DocNode
	 * @memberof SJSD.Parser
	 */
	var parsedBlock =
	{
		/**
		 * The name of the node. This is used for links and page titles.
		 * @property
		 * @memberof SJSD.Parser.DocNode
		 */
		name : "",
		
		/**
		 * A list of what modifiers were found. This is how they looked before being interpreted for meaning.
		 * @property rawModifiers
		 * @memberof SJSD.Parser.DocNode
		 */
		rawModifiers : [],
		
		/**
		 * The text content of the comment block once modifiers have been removed. This is treated as the long description of the node.
		 * @property text
		 * @memberof SJSD.Parser.DocNode
		 */
		text : "",
		
		/**
		 * The raw text of the comment block as it looked before parse.
		 * @property raw
		 * @memberof SJSD.Parser.DocNode
		 */
		raw : block,
		
		/**
		 * A text indication of what node is this node's parent. In most if not all cases this is required to write out explicitly in a comment block.
		 * @property memberof
		 * @memberof SJSD.Parser.DocNode
		 */
		memberof : null,
		
		/**
		 * The base type of the node. This is the deduced generic type. For example the given types "class", "object", "hash" and "entity" 
		 * all end up as the type "entity". 
		 * @property type
		 * @memberof SJSD.Parser.DocNode
		 */
		type : null,
		
		/**
		 * List of nodes which have been calculated as being children of this node. 
		 * @property children
		 * @memberof SJSD.Parser.DocNode
		 */
		children : [],
		
		/**
		 * A list of all the &#64;param modifiers
		 * @property params
		 * @memberof SJSD.Parser.DocNode
		 */
		params : [],
		
		/**
		 * The short description to use in lists. If not explicitly given via params, this will be extracted from the first sentence of the text
		 * content of the comment block.
		 * @property shortDesc
		 * @memberof SJSD.Parser.DocNode
		 */
		shortDesc : "(shortdesc missing)",
		
		/**
		 * This is the main global identifier for the node. It is (usually) a dot-separated representation of the ownership hierarchy. 
		 * @property qualifiedName
		 * @memberof SJSD.Parser.DocNode
		 */
		qualifiedName : "",
		
		/**
		 * A (joined) string representation of all the parameters. This is usually only used for functions.
		 * The names of the parameters will end up here as a joined comma-separated string.
		 * @property paramsAsString
		 * @memberof SJSD.Parser.DocNode
		 */
		paramsAsString : "",
		
		/**
		 * Whether the node has children which are of the "namespace" type.
		 * @property hasNamespaceChildren
		 * @memberof SJSD.Parser.DocNode
		 */
		hasNamespaceChildren: false,
		
		/**
		 * Whether the node has children which are of the "module" type.
		 * @property hasModuleChildren
		 * @memberof SJSD.Parser.DocNode
		 */
		hasModuleChildren: false,
		
		/**
		 * Whether the node has children which are of the "function" type.
		 * @property hasFunctionChildren
		 * @memberof SJSD.Parser.DocNode
		 */
		hasFunctionChildren: false,
		
		/**
		 * Whether the node has children which are of the "entity" type.
		 * @property hasEntityChildren
		 * @memberof SJSD.Parser.DocNode
		 */
		hasEntityChildren: false,
		
		/**
		 * Whether the node has children which are of the "property" type.
		 * @property hasPropertyChildren
		 * @memberof SJSD.Parser.DocNode
		 */
		hasPropertyChildren: false
	};

	_.forEach(lines, function(line)
	{
		line = line.replace(/^[\*\s]+/, "");
		var search = /(^|\W)@([\w]+)(.*)$/g;
		var match = search.exec(line);
		if(match)
		{
			var instr = match[2];
			var arg = match[3];
			if(arg)
			{
				arg = S(arg).trim().s;
			}

			parsedBlock.rawModifiers.push(
			{
				modifier : S(instr).trim().s,
				argument : S(arg).trim().s
			});
		}
		else
		{
			parsedBlock.text = parsedBlock.text + line + "\n";
		}
	});

	_.forEach(parsedBlock.rawModifiers, function(modifier)
	{
		var mod = modifier.modifier;

		if(mod === "function")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "function";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "method")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "function";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "class")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "entity";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "entity")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "entity";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "hash")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "entity";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "object")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "entity";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "module")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "module";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "namespace")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "namespace";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "property")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "property";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "member")
		{
			parsedBlock.givenType = mod;
			parsedBlock.type = "property";
			parsedBlock.name = modifier.argument;
		}

		if(mod === "name")
		{
			parsedBlock.name = modifier.argument;
		}

		if(mod === "shortdesc")
		{
			parsedBlock.shortDesc = modifier.argument;
		}

		if(mod === "memberof")
		{
			parsedBlock.memberof = modifier.argument;
		}

	});

	parsedBlock.text = parsedBlock.text.replace(/\s+/, " ");
	parsedBlock.text = S(parsedBlock.text).trim().s;
	parsedBlock.text = S(parsedBlock.text).replaceAll("\x02"," ").s;
	parsedBlock.text = S(parsedBlock.text).replaceAll("\x03","\n").s;
	
	this.spam("Text content of block:\n\n" + parsedBlock.text + "\n"); 

	if(parsedBlock.memberof)
	{
		parsedBlock.memberof = S(parsedBlock.memberof).trim().s;
		
		parsedBlock.memberof.replace("~","."); // JSDoc specific member, generalized for sjsd
		parsedBlock.memberof.replace("#","."); // JSDoc specific member, generalized for sjsd
		parsedBlock.memberof.replace(/[\s\S]+/,"."); // No whitespace in memberof, assume hierarchy instead
		parsedBlock.memberof.replace(/[.]+/,"."); // No multiple dots, replace with one dot
		parsedBlock.memberof.replace(/[.]+$/,""); // Cannot end with dot
		parsedBlock.memberof.replace(/^[.]+/,""); // Cannot start with dot
	}
	
	if(parsedBlock.name)
	{
		if(parsedBlock.memberof)
		{
			parsedBlock.qualifiedName = parsedBlock.memberof + "." + parsedBlock.name;
		}
		else
		{
			parsedBlock.qualifiedName = parsedBlock.name;
		}
	}

	this.spam("Resulting parsed block:\n\n");
	this.spam(parsedBlock);
	this.spam("\n\n");

	if(parsedBlock.name)
	{
		if(parsedBlock.type === "namespace")
		{
			this.namespaces[parsedBlock.qualifiedName] = parsedBlock;
			this.topLevel = "namespace";
		}

		if(parsedBlock.type === "module")
		{
			this.modules[parsedBlock.qualifiedName] = parsedBlock;
			if(this.topLevel !== "namespace")
			{
				this.topLevel = "module";
			}
		}

		if(parsedBlock.type === "entity")
		{
			this.entities[parsedBlock.qualifiedName] = parsedBlock;
			if(this.topLevel === "function")
			{
				this.topLevel = "entity";
			}
		}

		if(parsedBlock.type === "function")
		{
			this.functions[parsedBlock.qualifiedName] = parsedBlock;
		}
		
		if(parsedBlock.type === "property")
		{
			this.properties[parsedBlock.qualifiedName] = parsedBlock;
		}
		
		this.debug("Found a '" + parsedBlock.type + "' type block with the name '" + parsedBlock.name + "'");
	}
};

/**
 * Insert the child in the children array of a parent
 * 
 * @function appendChild
 * @param parent docnode an object which should have a child
 * @param child docnode an object which should be appended to the parent 
 * @returns void
 * @memberof SJSD.Parser
 */
Parser.prototype.appendChild = function(parent,child)
{
	if(!parent) { return; }
	if(!child) { return; }
	
	if(!parent.children)
	{
		parent.children = [];
	}
	
	if(child.type === "namespace") { parent.hasNamespaceChildren = true; }
	if(child.type === "module") { parent.hasModuleChildren = true; }
	if(child.type === "entity") { parent.hasEntityChildren = true; }
	if(child.type === "function") { parent.hasFunctionChildren = true; }
	if(child.type === "property") { parent.hasPropertyChildren = true; }
	
	parent.children.push(child);
};

/**
 * Find the parent of a docnode
 * 
 * @function findParent
 * @param child docnode an object which to find a parent for
 * @returns docnode the parent
 * @memberof SJSD.Parser
 */
Parser.prototype.findParent = function(child)
{
	if(!this.nodesByName) { return null; }
	if(!child) { return null; }
	
	var qn = child.qualifiedName;
	
	qn = qn.replace(/\.[\w]+$/,"");
	
	this.spam("findParent()");
	this.spam("  -- child: " + child.qualifiedName);
	this.spam("  -- search: " + qn);
	
	var parent = null;
	
	if(qn && qn !== child.qualifiedName)
	{
		parent = this.nodesByName[qn];
	}
	
	if(parent)
	{
		this.spam("  -- parent existed");
	}
	
	if(!parent)
	{
		this.spam("  -- parent did not exist");
	}
		
	return parent;
};

/**
 * Generate the end JSON structure for the documentation.
 * 
 * @function createTreeOutline
 * @returns void
 * @memberof SJSD.Parser
 */
Parser.prototype.createTreeOutline = function()
{	
	var stack = 
	{
			namespaces : [],
			modules : [],
			entities : [],
			functions : [],
			properties : []			
	};
	
	if(this.namespaces)
	{
		stack.namespaces = Object.keys(this.namespaces);
		stack.namespaces.sort();
	}

	if(this.modules)
	{
		stack.modules = Object.keys(this.modules);
		stack.modules.sort();
	}

	if(this.entities)
	{
		stack.entities = Object.keys(this.entities);
		stack.entities.sort();
	}

	if(this.functions)
	{
		stack.functions = Object.keys(this.functions);
		stack.functions.sort();
	}

	if(this.properties)
	{
		stack.properties = Object.keys(this.properties);
		stack.properties.sort();
	}

	this.debug("The full list of nodes to document is this:\n\n");
	this.debug(stack);
	this.debug("\n\n");
	
	var self = this;
	
	var types = ["namespaces","modules","functions","entities","properties"];
	 
	_.forEach(types,function(type)
	{
		_.forEach(self[type],function(node) {						
			self.debug("Appending " + node.qualifiedName + " (" + node.type + ") to list of known nodes.");			
			self.nodesByName[node.qualifiedName] = node;
		});
	});
		
	_.forEach(types,function(type)
	{
		var remaining = [];
		
		_.forEach(stack[type],function(nodeName) {
			var node = self.nodesByName[nodeName];
			var parent = self.findParent(node);
			if(parent)
			{
				self.appendChild(parent,node);
			}
			else
			{
				remaining.push(nodeName);
			}			
		});
		
		stack[type] = remaining;
	});
	
	/*this.distributeFunctions(stack);
	this.distributeProperties(stack);
	this.distributeEntities(stack);
	this.distributeModules(stack);*/
	
	
	this.parseTree.rootNodes = [];

	var names;
	
	if(this.topLevel === "namespace")
	{
		stack.namespaces = [];
		names = Object.keys(this.namespaces);
		_.forEach(names,function(name) {
			self.parseTree.rootNodes.push(self.namespaces[name]);
		});
	}
	
	if(this.topLevel === "module")
	{
		stack.modules = [];
		names = Object.keys(this.modules);
		_.forEach(names,function(name) {
			self.parseTree.rootNodes.push(self.modules[name]);
		});
	}
	
	if(this.topLevel === "entity")
	{
		stack.entities = [];
		names = Object.keys(this.entities);
		_.forEach(names,function(name) {
			self.parseTree.rootNodes.push(self.entities[name]);
		});
	}
	
	if(this.topLevel === "function")
	{
		stack.functions = [];
		names = Object.keys(this.functions);
		_.forEach(names,function(name) {
			self.parseTree.rootNodes.push(self.functions[name]);
		});
	}

	this.parseTree.withoutParents = stack;		

	this.spam("Resulting parse tree:\n");
	this.spam(JSON.stringify(this.parseTree,null,2));

};

/**
 * Extract short descriptions for all blocks that didn't set them explicitly.
 * The principle is that everything before the first dot end up as short description 
 * if shortdesc was empty at this point.
 * @function fixShortDesc
 * @memberof SJSD.Parser
 */
Parser.prototype.fixShortDesc = function()
{
	var self = this;
	
	var types = ["namespaces","modules","functions","entities","properties"];
	 
	_.forEach(types,function(type)
	{
		_.forEach(self[type],function(node) {			
						
			if(node.shortDesc === "(shortdesc missing)" && node.text)
			{
				var parts = node.text.split(".");
				if(parts && parts.length)
				{
					node.shortDesc = parts[0];
				}
			}						
		});
	});	
};

/**
 * Go through all blocks of the function type and construct lists of function params.
 * @function fixParams
 * @memberof SJSD.Parser
 */
Parser.prototype.fixParams = function()
{
	var pas;
	var self = this;
	var first;
	var name,desc,type;
	
	_.forEach(self.functions,function(node) {			
	
		pas = "(";
		first = true;
		
		_.forEach(node.rawModifiers,function(modifier) {
			if(modifier.modifier === "param")
			{
				name = "?";
				type = "?";
				desc = "";
								
				var parts = modifier.argument.split(/\s+/);
				//console.log(parts);
				
				if(parts && parts.length)
				{
					name = parts[0];
				}
				
				if(parts && parts.length > 1)
				{
					type = parts[1];
				}
				
				if(parts && parts.length > 2)
				{
					parts.splice(0,2);										
					desc = parts.join(" ");
				}
				
				node.params.push({ name: name, desc: desc, type: type });
				
				if(!first)
				{
					pas = pas + ", ";
				}
				else
				{
					first = false;
				}
				
				pas = pas + name;
			}
		});
		
		pas = pas + ")";
		node.paramsAsString = pas;
	});
};

/**
 * Find what block type we should start at when building the parse tree.
 * @function findTopLevel
 * @memberof SJSD.Parser
 */
Parser.prototype.findTopLevel = function()
{
	if(this.classes && this.classes.length)
	{
		this.topLevel = "entity";
	}

	if(this.modules && this.modules.length)
	{
		this.topLevel = "module";
	}

	if(this.namespaces && this.namespaces.length)
	{
		this.topLevel = "namespace";
	}
};

/**
 * Starting point for building the parse tree from the source string.
 * @function parseData
 * @memberof SJSD.Parser
 */
Parser.prototype.parseData = function()
{	
	this.debug("Source files have been merged. About to start parsing.\n");
	this.spam("Full source string as follows:\n\n" + this.rawSourceString + "\n\n");	

	var search = /\/\*\*([\s\S]+?)\*\//g;
	var match = search.exec(this.rawSourceString);

	this.rawBlocks = [];

	while(match)
	{
		this.rawBlocks.push(match[1]);
		this.parseBlock(match[1]);
		match = search.exec(this.rawSourceString);
	}

	this.findTopLevel();
	this.fixShortDesc();
	this.fixParams();
	this.createTreeOutline();
};

module.exports = Parser;
