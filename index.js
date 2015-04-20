var fs = require('fs');
var config = require('./config.json');

var Mustache = require('mustache');
var Promise = require('promise');
var Markdown = require('node-markdown').Markdown;
var async = require('async');

['log', 'warn'].forEach(function(method) {
  var old = console[method];
  console[method] = function() {
    var stack = (new Error()).stack.split(/\n/);
    // Chrome includes a single "Error" line, FF doesn't.
    if (stack[0].indexOf('Error') === 0) {
      stack = stack.slice(1);
    }
    var args = [].slice.apply(arguments).concat([stack[1].trim()]);
    return old.apply(console, args);
  };
});

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
					bakeFunction(pathComponents.join('/') + '/' + path, true);
					var arr = pathComponents.slice(0); // make copy of pathComponents
					arr.push(path);
					recurseDir(null, bakeFunction, arr);
				}
			});

			// check last index + check numdir
		});

	})
};

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
						} else {
							fulfill(true);
						}
					});
				} else if (stats.isDirectory()) {
					if (i === arr.length - 1) {
						fulfill(true);
					}
				} else {
					reject(err);
				}
			});
		});
	});
};

var ensureDirExists = function(){
	//TODO: this way is better because currently testPath is
	//the only Promise patterned function in the whole scrpit.
	//Plus this can mark checked directories and skip ahead. 
	//BECAUSE CLOSURRREEE

	var checkedDirs = [];
	return function(pathComp, bakeFunc) {
		var tryPath = "";
		pathComp.forEach(function(dir, i, arr){
			//
			// TODO: maybe use mkdirp module
			tryPath += dir + '/';

			if (checkedDirs.indexOf(tryPath) < 0) {
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
						reject(err);
					}
				});
			} else {
				bakeFunc(null);
			}
		});
	};
}(); // closure motherfucker

var bakeFile = function(filePath, isListing) {


	var fileInfo = {
		type: null,
		fullPath : filePath,
		dirComponents: function(fp) { var arr = fp.split('/').splice(0); arr.splice(-1, 1); return arr; }(filePath), 
		timeCreated : null,
		timeModified : null
	};

	if (isListing) {
		fileInfo.type = 'collection';
		fileInfo.fileName = filePath.split('/').splice(-1, 1)[0];

		var outputName = fileInfo.fileName + '.html';
		var listingName = fileInfo.fileName;

		fs.readdir(fileInfo.fullPath, function(err, files) {
			if (err) { handleError(err); }
			
			var postInfo = {};
			var parallelTasks = [];
			files.forEach(function(file, i, arr){
				fs.stat(fileInfo.fullPath + '/' + file, function(err, stats){
					if (err) { handleError(err); }
					if (stats.isFile()) {
						parallelTasks.push( function(callback){
							fs.readFile(fileInfo.fullPath + '/' + file, 'utf8', function(err, data){
								if (err) { callback(err); }

								var postInfo = {};
								postInfo.title = data.split('\n')[0];
								postInfo.content = Markdown(data.split('\n').slice(1).join('\n').trim());
								postInfo.slug = file;
								postInfo.permalink = function(){ var fileComp = file.split('.'); fileComp[fileComp.length - 1] = 'html'; file = fileComp.join('.'); return '/' + listingName + '/' + file; }();

								callback(null, postInfo);
							});
						});
					}

					if (i === arr.length - 1) {
						async.parallel(parallelTasks, function(err, results){
							if (err) { throw(err); }
							postInfo.collection = results;
							getTemplateForFile(fileInfo, function(err, tpObj){
								if (err) {handleError(err); }
								var out = Mustache.render(tpObj.template, postInfo, tpObj.partials);

								fileInfo.dirComponents[0] = config.public_dir;

								// testPath checks for and creates dirs in paths before writing output .html
								testPath(fileInfo.dirComponents).then(function(){
									var outFileName = fileInfo.fileName + '.html';
									var filePath = fileInfo.dirComponents.join('/') + '/' + outFileName;
									fs.writeFile(filePath, out, function(err){
										if (err) { handleError(err); }
									});
								});
							});
						});
					}
				});
			});
		});

	} else {

		fileInfo.type = 'post';
		fileInfo.fileName = filePath.split('/').splice(-1, 1)[0];
		fileInfo.fileExtension = function(fp) {var filename = filePath.split('/').splice(-1, 1); return filename[0].split('.').splice(-1, 1)[0]; }(filePath);

		var postInfo = {};

		// TODO: now this also bakes .drafts. implement check for .drafts

		getTemplateForFile(fileInfo, function(err, tpObj){
			fs.readFile(filePath, { encoding: 'utf8'}, function(err, data){

				if (err) { handleError(err); }

				postInfo.title = data.split('\n')[0];
				postInfo.content = Markdown(data.split('\n').slice(1).join('\n').trim());


				var out = Mustache.render(tpObj.template, postInfo, tpObj.partials);

				fileInfo.dirComponents[0] = config.public_dir;

				// testPath checks for and creates subdirs before writing output .html
				testPath(fileInfo.dirComponents).then(function(){
					var outFileName = fileInfo.fileName.replace(fileInfo.fileExtension, 'html');
					var filePath = fileInfo.dirComponents.join('/') + '/' + outFileName;
					fs.writeFile(filePath, out, function(err){
						if (err) { handleError(err); }
					});
				});

			});
		});
	}


};

var getTemplateForFile = function(){

	var templates = undefined;

	return function(fileInfo, cb) {

		async.whilst(
			function () {
				if (!templates) { return true; }
				return Object.keys(templates).length === 0;
			}, function (callback) {
				templates = {};
				fs.readdir(config.template_dir, function(err, files){
					if (err) { throw err; }
					async.concat(files, function(item, f){
						fs.readFile(config.template_dir + '/' + item, 'utf8', function(err, data){
							if (err) { f(err); }
							var propName = item.replace('.mustache', '');
							templates[propName] = data;
							f(null, data);
						})
					}, function(err, results){
						if (err) { throw(err); }
						callback(null);
					});
				});
			}, function(err){

				if (err) {
					console.error('repeated attempts to read templates into object has failed');
					throw(err);
				}

				var tpObj = {
					template: null,
					partials: templates
				};

				if (templates[fileInfo.fileName]) {
					tpObj.template = templates['index_' + fileInfo.filename];
				} else if (templates[fileInfo.dirComponents.slice(-1, 1)]) {
					tpObj.template = templates['col_' + fileInfo.dirComponents.slice(-1, 1)];
				} else {
				if (fileInfo.type === 'post') {
					tpObj.template = templates.index
				}

				if (fileInfo.type === 'collection') {
					tpObj.template = templates.collection
				}
				}


				cb(null, tpObj);
			}
		);
	};
}();

recurseDir(config.source_dir, bakeFile);
