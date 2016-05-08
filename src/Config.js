var fs = require('fs');
var path = require('path');
var S = require('string');
var _ = require('underscore');
var commandLineArgs = require('command-line-args');
var fileExists = require('file-exists');

var cliSettings = [
                   { name: 'config', alias: 'c', type: String },
                   { name: 'debug', alias: 'd', type: Boolean },
                   { name: 'outputdir', alias: 'o', type: String },
                   { name: 'templatesdir', alias: 't', type: String },
                   { name: "files", type: String, multiple: true, defaultOption: true }
                 ];

var defaultOptions =
{
		files : [],
		debug : false,
		config : null,
		outputdir : ".",
		templatesdir : path.join(__dirname,'..','templates')
};

var Config = function()
{	
	this.cwd = process.cwd();
	
	this.cli = commandLineArgs(cliSettings);
	
	var options = this.cli.parse();
	
	if(options.config)
	{
		this.checkParseConfigFile(options.config);
	}
	else
	{
		this.options = defaultOptions; 				
	}
	
	this.fillFiles(options);
	
	
	if(options.debug)
	{
		this.options.debug = true;
	}
	else
	{
		this.options.debug = false;
	}
	
	if(!this.options || !this.options.files || !this.options.files.length)
	{
	  console.log(this.cli.getUsage());
	  process.exit(1);
	}	
	
	if(this.options.debug)
	{
		console.log("The end configuration (after any config file and command line args) is this:\n");
		console.log(this.options);
		console.log("\n");
	}
};

Config.prototype.checkParseConfigFile = function(configPath)
{
	var configFile = configPath;
	if(!fileExists(configFile))
	{
		configFile = path.join(this.cwd,configPath);
	}
	if(!fileExists(configFile))
	{
		console.log("The specified config file " + configPath + " does not exist.");
		process.exit(1);
	}
	
	var conf = fs.readFileSync(configFile,'utf8');
	var options = JSON.parse(conf);
	options.config = configFile;
	
	this.options = _.extend(defaultOptions,options);		
};

Config.prototype.fillFiles = function(options)
{
	var self = this;
	
	if(options.files && options.files.length)
	{
		if(!this.options.files || !this.options.files.length)
		{
			this.options.files = options.files;
		}
		else
		{
			_.forEach(options.files, function(fileName) {
				if(!_.contains(self.options.files,fileName)) {
					self.options.files.push(fileName);
				}
			});
		}
	}	
};

module.exports = Config;
