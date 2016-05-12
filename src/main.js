#! /usr/bin/env node

var commandLineArgs = require('command-line-args');
var fileExists = require('file-exists');
var _ = require('underscore');

var Config = require("./Config");
var config = new Config();


var Parser = require("./Parser");
var parser = new Parser(config);

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
var templates = new TemplateSet(config);

templates.render(parser);

// --- THE REST OF THE FILE CONTAINS DOCS AND EXAMPLES, NO CODE BELOW THIS POINT

/**
 * SJSD, Simplified JavaScript Documentation, is a tool for generating code documentation
 * from inline source code comments. Contrary to other similar tools, it does not attempt
 * to make a source code analysis. It instead leaves to the user to decide how to structure
 * the documentation of the code.<br /><br />
 * 
 * If you have downloaded the software as a git clone or as a zip, run it thus:
<code>
node [dir with sjsd]/src/main.js -o [dir for output] [file1] [file2] ... [file n]
</code>
 *
 * If you installed the software via NPM (ie "npm install -g sjsd"), run it thus:
<code>
sjsd -o [dir for output] [file1] [file2] ... [file n]
</code>
 *
 * You can find more information and some examples further down. To get information about the
 * SJSD code/api, follow the links in the Entities section.
 * 
 * @module SJSD
 */
