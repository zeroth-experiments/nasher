'use strict';

const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const markdown = require('marked');
const logger = require('./logger');
const info = logger('info');
const debug = logger('debug');
const cp = require('copy-dir');

markdown.setOptions({
    pedantic: true,
    smartypants: true,
    sanitize: false
});

module.exports = {
    isDirectory: isDirectory,
    isFile: isFile,
    isMakrdown: isMakrdown,
    makeFirstLetterCap: function (word) {
        return word.split('').map((l, index) => index == 0 ? l.toUpperCase() : l).join('');
    },
    normalizePathForJP: normalizePathForJP,
    normalizePathFromJP: normalizePathFromJP,
    pathToBuildDir: pathToBuildDir,
    fileObj: fileObj,
    fileToUrl: fileToUrl,
    copyDir: copyDir
}

function copyDir(src, dest) {
    cp(src, dest, function(err){
        if(err){
            debug('there is a problem copying ', src, ' to ', dest, ' - ', err);
        }
    });
}

function isDirectory(val) {
    if (!fs.existsSync(val)) return false;
    return fs.lstatSync(val).isDirectory();
}

function isFile(val) {
    if (!fs.existsSync(val)) return false;
    return fs.lstatSync(val).isFile();
}

function isMakrdown(val) {
    if (!isFile(val)) {
        throw new Error(`${val} is not a valid file`);
    }
    return true;
}

function cleanPath(val) {
    let _path = val;
    if (_path.startsWith('.')) {
        _path = _path.slice(1);
    }
    if (_path.startsWith('/')) {
        _path = _path.slice(1);
    }
    return _path;
}
function normalizePathForJP(val) {
    let _path = val;
    if (_path.startsWith('.')) {
        _path = _path.slice(1);
    }
    if (_path.startsWith('/')) {
        return _path;
    } else {
        return '/' + _path;
    }
}

function normalizePathFromJP(val) {
    let _path = val;
    if (_path.startsWith('/')) {
        return _path.slice(1);
    }
    return _path;

}

function normalizePath(val, config) {
    
    // let home_dir = config.home_dir || config;
    let home_dir = config.hasOwnProperty("home_dir") ? config.home_dir : config;
    home_dir = cleanPath(home_dir);

    if(!home_dir || home_dir === "" ||home_dir === " ") {
        home_dir = '.';
    }
    let parsed_dir = val;
    // if (parsed_dir.startsWith(path.sep)) {
    //     home_dir = path.sep + home_dir;
    // }

    if(parsed_dir.indexOf(home_dir)) {
        parsed_dir = path.join.apply(null, parsed_dir.split(home_dir));
    }

    if (parsed_dir.startsWith(home_dir)) {
        parsed_dir = parsed_dir.split(home_dir)[1];
        // info('NormalizePath parse dir for : ', val, " is : ", parsed_dir);
        
    }
    
    return parsed_dir;
}

function pathToBuildDir(val, config = null, normalize = true) {
    if(val.endsWith("index.md")){
        val = val.slice(0, val.indexOf('index.md'));
    }
    let base = path.normalize(config.documents_dir);
    let parsed_dir = val;
    // info(val, ": ", parsed_dir);
    if(normalize) {
        val.split(base)[1];
        parsed_dir = normalizePath(parsed_dir, config);
        // info(val, " normalizes path : ", parsed_dir);
    }
    
    let parsed = path.parse(parsed_dir);
    //src/docs/articles/state_of_embedded_programming.md
    //build/src/docs/articles/state_of_embedded_programming
    let build_path = path.join('build', parsed.dir, parsed.name);
        // info(val, " build path : ", build_path);
    
    return build_path;
}

function fileToUrl(val) {
    val = normalizePathForJP(val).slice(1);
    
    let url = val.split(path.sep);
    // TODO: need to test more
    if(url.length > 1){
        url = val.split(path.sep).slice(1).join(path.sep).split('.')[0];
    }
    
    
    return url;
}

function fileObj(val, home_dir, documents_dir) {
    let fd = fs.openSync(val, 'r');
    let file_conent = fs.readFileSync(fd);
    let file_stats = fs.fstatSync(fd);
    fs.close(fd);
    let file_fm = fm(file_conent.toString());
    let description = file_fm.attributes.description || file_fm.body.toString().split('\n').slice(0, 5).join('\n');
    file_fm.attributes.description = markdown(description);
    let file_meta = file_fm.attributes;
    file_meta["__type__"] = 'file';
    file_meta["__path__"] = val;
    file_meta["__fstat__"] = file_stats;
    
    let url_path = normalizePath(val, home_dir);
    url_path = normalizePath(val, documents_dir);
     
    file_meta["url"] = fileToUrl(url_path);
    let body = markdown(file_fm.body);
    return {
        meta: file_meta,
        markdown: file_fm.body,
        body: body
    };
}
