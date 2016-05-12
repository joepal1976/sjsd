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
var TemplateSet = function(config) 
{	
	this.config = config;
	
	var rootPath = config.options.templatesdir;
	var outputDir = config.options.outputdir;
	
	
	if(!rootPath)
	{
		rootPath = path.join(__dirname,"..","templates");
	}

	if(!outputDir)
	{
		//outputDir = path.join(__dirname,"..","docs");
		console.log("ERROR: Setting output directory is required.\n");
		process.exit(1);
	}

	this.path = rootPath;
	this.outputDir = outputDir;
	this.templates = {};
	
	this.debug("Using template path: " + rootPath);
	this.debug("Using output path: " + outputDir);
	
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
 * Write a debug message to the console if debug is enabled.
 * @function debug
 * @param message string What to write to the console
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype.debug = function(message)
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
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype.spam = function(message)
{
	if(this.config.spam)
	{
		console.log(message);
	}
};

/**
 * Try to read a template from disk. If the template doesn't exist, try to use a generic template.
 * @function detectTemplate
 * @param base string The base name of the template, for example "module".
 * @param suffix string What subclass of template to use, in practice none, "_item" or "_section".
 * @memberof SJSD.TemplateSet
 */
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
		this.debug("Reading template file: " + templatePath); 
		var templateString = fs.readFileSync(templatePath,'utf8');
		this.spam("Template string before compilation:\n\n" + templateString);
		this.templates[templateName] = _.template(templateString);
		this.spam("Template after compilation:\n\n" + this.templates[templateName].source);
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
				this.debug("No template for " + templateName + ". Using generic alternative " + gen); 
				this.templates[templateName] = this.templates[gen];
			}
			else
			{
				this.debug("No template for " + templateName); 
			}
		}
		else
		{
			this.debug("No template for " + templateName); 
		}
	}
};

/**
 * Write index.html to disk. This function will do nothing if there was no index template.
 * @function _writeIndex
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype._writeIndex = function()
{
	if(!this.templates.index)
	{
		this.debug("No template for index, skipping this.");
		return;
	}	
	
	var out = this.templates.index({ "parser": this.parser, templates : this.templates });
	this.spam("Result from template:\n\n" + out);
	fs.writeFileSync(path.join(this.outputDir,"index.html"),out);
	this.debug("Wrote " + path.join(this.outputDir,"index.html"));
}; 

/**
 * Write html for all modules to disk. This function will do nothing if there was no module or generic template. 
 * @function _writeModules
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype._writeModules = function()
{	
	if(!this.templates.module)
	{
		this.debug("No template for modules, skipping these.");
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.modules,function(module) {
		var out = self.templates.module({ "item": module, "parser": self.parser, templates : self.templates });
		self.spam("Result from template:\n\n" + out);
		var filePath = path.join(self.outputDir,module.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		self.debug("Wrote " + filePath);
	});		
}; 

/**
 * Write html for all entities to disk. This function will do nothing if there was no entity or generic template. 
 * @function _writeEntities
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype._writeEntities = function()
{	
	if(!this.templates.entity)
	{
		this.debug("No template for entities, skipping these.");
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.entities,function(entity) {
		var out = self.templates.entity({ "item": entity, "parser": self.parser, templates : self.templates });
		self.spam("Result from template:\n\n" + out);
		var filePath = path.join(self.outputDir,entity.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		self.debug("Wrote " + filePath);
	});		
}; 

/**
 * Write html for all functions to disk. This function will do nothing if there was no function or generic template. 
 * @function _writeFunctions
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype._writeFunctions = function()
{	
	if(!this.templates["function"])
	{
		this.debug("No template for functions, skipping these.");
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.functions,function(f) {
		var out = self.templates["function"]({ "item": f, "parser": self.parser, templates : self.templates });
		self.spam("Result from template:\n\n" + out);
		var filePath = path.join(self.outputDir,f.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		self.debug("Wrote " + filePath);		
	});		
}; 

/**
 * Write html for all properties to disk. This function will do nothing if there was no property or generic template. 
 * @function _writeProperties
 * @memberof SJSD.TemplateSet
 */
TemplateSet.prototype._writeProperties = function()
{	
	if(!this.templates.property)
	{
		this.debug("No template for properties, skipping these.");
		return;
	}
	
	var self = this;
	
	_.forEach(this.parser.properties,function(f) {
		var out = self.templates.property({ "item": f, "parser": self.parser, templates : self.templates });
		self.spam("Result from template:\n\n" + out);
		var filePath = path.join(self.outputDir,f.qualifiedName + ".html");
		fs.writeFileSync(filePath,out);
		self.debug("Wrote " + filePath);		
	});		
}; 

/**
 * Render all templates to html on disk. 
 * @function render
 * @param parser Parser A filled Parser object.
 * @memberof SJSD.TemplateSet
 */
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
	
	this.debug("CSS in path is: " + cssInputPath);
	this.debug("CSS out path is: " + cssInputPath);
	
	if(fileExists(cssInputPath))
	{
		fs.copySync(cssInputPath,cssOutputPath);
		this.debug("Wrote " + cssOutputPath);
	}
};

module.exports = TemplateSet;
