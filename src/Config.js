var fs = require('fs');
var path = require('path');
var S = require('string');
var _ = require('underscore');
var commandLineArgs = require('command-line-args');
var fileExists = require('file-exists');

var cliSettings = [
                   { name: 'config', alias: 'c', type: String },
                   { name: 'debug', alias: 'd', type: Boolean },
                   { name: 'spam', alias: 's', type: Boolean },
                   { name: 'outputdir', alias: 'o', type: String },
                   { name: 'templatesdir', alias: 't', type: String },
                   { name: "files", type: String, multiple: true, defaultOption: true }
                 ];

/**
 * The options object is the end result after having parsed the configuration and the command line arguments. It is normally 
 * available under [config object].options.  
 * 
 * @entity Options
 * @memberof SJSD.Config
 */
var defaultOptions =
{
		/**
		 * An array of filenames to parse. The files are assumed to be any form of text file with 
		 * comment blocks. They don't necessarily have to be javascript files.
		 * @property files 
		 * @memberof SJSD.Config.Options
		 */
		files : [],
		
		/**
		 * Whether to print debug output during the process. 
		 * @property debug
		 * @memberof SJSD.Config.Options
		 */
		debug : false,
		
		/**
		 * Whether to spam an excessive amount of debug output during the process. This implies debug. 
		 * @property spam
		 * @memberof SJSD.Config.Options
		 */
		spam : false,		
		
		/**
		 * The path to the config file (if any).
		 * @property config
		 * @memberof SJSD.Config.Options
		 */
		config : null,
		
		/**
		 * The path to a directory where to write the output.
		 * @property outputdir
		 * @memberof SJSD.Config.Options
		 */
		outputdir : null,
		
		/**
		 * The path to the dir where templates are found. This defaults to the internal "default" template set.
		 * @property templatesdir
		 * @memberof SJSD.Config.Options
		 */
		templatesdir : path.join(__dirname,'..','templates')
};

/**
 * This is the configuration and command line arguments manager. It is responsible for interpreting the config file, 
 * and modifying it according to what command line arguments have been supplied.
 * 
 * @class Config
 * @memberof SJSD
 */
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
		
	if(options.outputdir)
	{
		this.options.outputdir = options.outputdir;
	}
	
	if(options.debug)
	{
		this.options.debug = true;
	}
	else
	{
		this.options.debug = false;
	}		

	if(options.spam)
	{
		this.options.debug = true;
		this.options.spam = true;
	}
	else
	{
		this.options.spam = false;
	}		

	this.fillFiles(options);	

	if(!this.options || !this.options.files || !this.options.files.length)
	{
	  console.log(this.cli.getUsage());
	  process.exit(1);
	}	
	
	if(this.options.spam)
	{
		console.log("\nThe end configuration (after any config file and command line args) is this:\n");
		console.log(this.options);
		console.log("\n");
	}
};

/**
 * Parse the config file (if any).
 * @param configPath path Path to a json file with configuration settings.
 * @memberof SJSD.Config 
 */
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

/**
 * Build a list of files to parse. These can be supplied via both the config file and command line. 
 * @param options Options The Options object as it looks before having filled the file array.
 * @memberof SJSD.Config 
 */
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
	
	_.forEach(self.options.files, function(fileName) {				
		if(!fileExists(fileName))
		{
			console.log("The specified source file " + fileName + " does not exist");
			process.exit(1);
		}
		else
		{			
			if(self.options.spam) { console.log("Registering " + fileName + " as file to find docs in."); }
		}
	});
};

module.exports = Config;
