var jshint = require('gulp-jshint');
var rename = require("gulp-rename");
var uglify = require('gulp-uglify');
var beautify = require('gulp-jsbeautify');
var gulp = require('gulp');

gulp.task('validate',function() {
    return gulp.src('src/js/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'))
        .pipe(jshint.reporter('fail'));
});

gulp.task('beautify',['validate'],function() {
   return gulp.src('src/**')
        .pipe(beautify())
        .pipe(gulp.dest('src'))
        .pipe(gulp.dest('dist'));
});

gulp.task('compile',['beautify'],function() {
    return gulp.src('src/js/*.js')
        .pipe(uglify({"preserveComments":"license"}))
        .pipe(rename({ suffix: '.min'}))
        .pipe(gulp.dest('dist/js/'));
});

gulp.task('copy',['compile'],function() {
    return gulp.src('dist/js/video-pointer.js')
        .pipe(gulp.dest('demo/'));
});

gulp.task('default',['validate','beautify','compile','copy']);