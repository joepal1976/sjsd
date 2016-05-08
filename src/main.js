#! /usr/bin/env node

/**
 * This is the command line starting point of the module.
<code>
/&#42;&#42; Hello &#42;/
</code>
 * @module SJSD
 */

var commandLineArgs = require('command-line-args');
var fileExists = require('file-exists');
var _ = require('underscore');

var Config = require("./Config");
var config = new Config();


var Parser = require("./Parser");
var parser = new Parser();
parser.enableDebugging(config.options.debug);

_.forEach(config.options.files, function(file) {

  if(!fileExists(file))
  {
    console.log("ERROR: File " + file + " does not exist");
    process.exit(1);
  }

  parser.addFile(file);
});
parser.parseData();

var TemplateSet = require("./TemplateSet");
var templates = new TemplateSet(config.options.templatesdir,config.options.outputdir);

templates.render(parser);
