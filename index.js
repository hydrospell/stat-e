var fs = require('fs');
var config = require('./config.json');

var Mustache = require('mustache');
var Promise = require('promise');
var Markdown = require('node-markdown').Markdown;

var handleError = function(err) {
	throw (err);
};

var recurseDir = function(topPath, bakeFunction, pathComponents) {
	if (!pathComponents || pathComponents.length === 0) {
		pathComponents = [];
		pathComponents.push(topPath);
	}

	var dirPath = pathComponents.join('/');
	dirPath = dirPath + "/";

	fs.readdir(dirPath, function(err, paths){
		if (err) { handleError(err); }
		paths.forEach(function(path){
			fs.stat(dirPath + '/' + path, function(err, stats){
				if (err) { handleError(err); }
				if (stats.isFile()) {
					bakeFunction(pathComponents.join('/') + '/' + path);
				} else if (stats.isDirectory()) {
					var arr = pathComponents.slice(0); // make copy of pathComponents
					arr.push(path);
					recurseDir(null, bakeFunction, arr);
				}
			});

			// check last index + check numdir
		});

	})
};

var bakeFile = function(filePath) {

	var fileInfo = {
		fullPath : filePath,
		dirComponents: function(fp) { var arr = fp.split('/').splice(0); arr.splice(-1, 1); return arr; }(filePath), 
		fileName : filePath.split('/').splice(-1, 1)[0],
		fileExtension : function(fp) {var filename = filePath.split('/').splice(-1, 1); return filename[0].split('.').splice(-1, 1)[0]; }(filePath),
		timeCreated : null,
		timeModified : null
	};

	var postInfo = {};

	// now this also bakes .drafts
	// TODO: implement check for .drafts

	getTemplateForFile(fileInfo, function(err, template){
		fs.readFile(filePath, { encoding: 'utf8'}, function(err, data){

			if (err) { handleError(err); }

			postInfo.content = Markdown(data);

			var out = Mustache.render(template, postInfo);

			fileInfo.dirComponents[0] = config.public_dir;

			var testPath = function(pathComp) {
				return new Promise(function(fulfill, reject){
					var tryPath = "";
					pathComp.forEach(function(dir, i, arr){
						// maybe use mkdirp module
						tryPath += dir + '/';
						fs.stat(tryPath, function(err, stats){
							if ((err && err.code === 'ENOENT') || !(stats && stats.isDirectory())) {
								fs.mkdir(tryPath, function(err){
									if (err && err.code === 'EEXIST') {
										if (i === arr.length - 1) {
											fulfill(true);
										}
									} else if (err) {
										(err);
									}
								});
							} else if (stats.isDirectory()) {
								if (i === arr.length - 1) {
									fulfill(true);
								}
							} else {
								console.log('rejecting' + err);
								reject(err);
							}
						});
					});
				});
			};

			testPath(fileInfo.dirComponents).then(function(){
				var outFileName = fileInfo.fileName.replace(fileInfo.fileExtension, 'html');
				var filePath = fileInfo.dirComponents.join('/') + '/' + outFileName;
				fs.writeFile(filePath, out, function(err){
					if (err) { handleError(err); }
				});
			});

		});
	});

};

var getTemplateForFile = function(fileInfo, cb) {
	
	// logic goes here

	fs.readFile(config.template_dir + '/index.mustache', { encoding: 'utf8'}, function(err, data){
		if (err) { cb(err); }
		cb(null, data);
	});

};

recurseDir(config.source_dir, bakeFile);
