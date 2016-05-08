var fs = require('fs-extra');
var path = require('path');
var S = require('string');
var _ = require('underscore');
var fileExists = require('file-exists');

var types = 
[
 	"generic",
 	"namespace",
 	"module",
 	"entity",
 	"function",
 	"property"
];

/**
 * This is the template management class. It is responsible for reading and parsing template files
 * and then piping an incoming Parser object through them.
 * 
 * @class TemplateSet
 * @memberof SJSD
 */
var TemplateSet = function(rootPath,outputDir) 
{	
	this.debug = false;
	
	if(!rootPath)
	{
		rootPath = path.join(__dirname,"..","templates");
	}

	if(!outputDir)
	{
		outputDir = path.join(__dirname,"..","docs");
	}

	this.path = rootPath;
	this.outputDir = outputDir;
	this.templates = {};
	
	this.detectTemplate("index");
	this.detectTemplate("footer");
	
	var self = this;
	
	_.forEach(types,function(type) 
	{
		self.detectTemplate(type);
		self.detectTemplate(type , "_item");
		self.detectTemplate(type , "_section");
	});
};

/**
 * Enable or disable debugging
 * 
 * @function enableDebugging
 * @param debug boolean for deciding if debugging should be enabled.
 * @returns The TemplateSet object the method was called on
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype.enableDebugging = function(debug)
{
	this.debug = debug;
	return this;
};

TemplateSet.prototype.detectTemplate = function(templateBase,templateSuffix)
{
	var templateName = templateBase;
	if(templateSuffix)
	{
		templateName = templateName + templateSuffix;
	}
	
	var templatePath = path.join(this.path,templateName + ".html");
	if(fileExists(templatePath))
	{
		if(this.debug) { console.log("Reading template file: " + templatePath); }
		var templateString = fs.readFileSync(templatePath,'utf8');
		this.templates[templateName] = _.template(templateString);
	}
	else
	{
		if(templateBase !== "generic")
		{
			var gen = "generic";
			if(templateSuffix)
			{
				gen = gen + templateSuffix;
			}
			
			if(this.templates[gen])
			{
				if(this.debug) { console.log("No template for " + templateName + ". Using generic alternative " + gen); }
				this.templates[templateName] = this.templates[gen];
			}
			else
			{
				if(this.debug) { console.log("No template for " + templateName); }
			}
		}
		else
		{
			if(this.debug) { console.log("No template for " + templateName); }
		}
	}
};

TemplateSet.prototype._writeIndex = function()
{
	if(!this.templates.index)
	{
		// No index template, skip this
		return;
	}	
	
	var out = this.templates.index({ "parser": this.parser, templates : this.templates });	
	fs.writeFileSync(path.join(this.outputDir,"index.html"),out);
	console.log("Wrote " + path.join(this.outputDir,"index.html"));
}; 

TemplateSet.prototype._writeModules = function()
{	
	if(!this.templates.module)
	{
		// No module template, skip this
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.modules,function(module) {
		var out = self.templates.module({ "item": module, "parser": self.parser, templates : self.templates });
		var filePath = path.join(self.outputDir,module.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		console.log("Wrote " + filePath);
	});		
}; 

TemplateSet.prototype._writeEntities = function()
{	
	if(!this.templates.entity)
	{
		// No entity template, skip this
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.entities,function(entity) {
		var out = self.templates.entity({ "item": entity, "parser": self.parser, templates : self.templates });
		var filePath = path.join(self.outputDir,entity.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		console.log("Wrote " + filePath);
	});		
}; 

TemplateSet.prototype._writeFunctions = function()
{	
	if(!this.templates["function"])
	{
		// No entity template, skip this
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.functions,function(f) {
		var out = self.templates["function"]({ "item": f, "parser": self.parser, templates : self.templates });
		var filePath = path.join(self.outputDir,f.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		console.log("Wrote " + filePath);		
	});		
}; 

TemplateSet.prototype._writeProperties = function()
{	
	if(!this.templates.property)
	{
		// No property template, skip this
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.properties,function(f) {
		var out = self.templates.property({ "item": f, "parser": self.parser, templates : self.templates });
		var filePath = path.join(self.outputDir,f.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		console.log("Wrote " + filePath);		
	});		
}; 

TemplateSet.prototype.render = function(parser)
{
	if(!parser)
	{
		console.log("Cannot render null parser");
		process.exit(1);
	}
	this.parser = parser;
	this._writeIndex();
	this._writeModules();
	this._writeEntities();
	this._writeFunctions();
	this._writeProperties();
	
	var cssInputPath = path.join(this.path,"sjsd.css");
	var cssOutputPath = path.join(this.outputDir,"sjsd.css");
	
	if(this.debug)
	{
		console.log("CSS in path is: " + cssInputPath);
		console.log("CSS out path is: " + cssInputPath);
	}
	
	if(fileExists(cssInputPath))
	{
		fs.copySync(cssInputPath,cssOutputPath);
		console.log("Wrote " + cssOutputPath);
	}
};

module.exports = TemplateSet;
