module.exports = function(grunt) {
    grunt.initConfig({
        nodeunit: {
            all: ['test/**/*.test.js']
        },
        jshint: {
            options: {
                jshintrc: ".jshintrc"
            },
            all: [
                "*.js",
                "!(node_modules)/*.js"
            ]
        },
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    grunt.registerTask('test', ['jshint', 'nodeunit']);
};
