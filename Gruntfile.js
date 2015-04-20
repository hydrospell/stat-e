module.exports = function(grunt) {

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		exec: {
			upload_website: {
				command: 'rsync -avr public/ siah@arbtr.com:www/octobrain.net/pages/',
				stdout: true
			},
			bake: {
				command: 'node index'
			},
			clear: {
				command: 'rm -rf /home/siah/dev/stat-e/public/*'
			}
		},
		sass: {
			dist: {
				files: [{
					expand: true,
					cwd: 'src/css',
					src: ['*.scss'],
					dest: 'public/css',
					ext: '.css'
				}]
			}
		}
	});

	grunt.loadNpmTasks('grunt-exec');
	grunt.loadNpmTasks('grunt-contrib-sass');

	// Default task(s).
	grunt.registerTask('b', ['sass:dist','exec:bake']);
	grunt.registerTask('c', ['exec:clear']);
	grunt.registerTask('bup', ['sass:dist','exec:bake', 'exec:upload_website']);
	grunt.registerTask('up', ['exec:upload_website']);
};
