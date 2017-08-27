'use strict';

const fs = require('fs');
const path = require('path');
const fm = require('front-matter');
const markdown = require('marked');
const logger = require('./logger');
const info = logger('info');
const debug = logger('debug');
const cp = require('copy-dir');
const safe = require('safetydance');

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
    buildDirPath: buildDirPath,
    fileMeta: fileMeta,
    fileToUrl: fileToUrl,
    copyDir: copyDir,
    removeBase: removeBase,
    addBase: addBase,
    fileContents:fileContents
}

function copyDir(src, dest) {
    cp(src, dest, function (err) {
        if (err) {
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
    // this is if there is no other path then current dir
    if (val == ".") {
        return val;
    }
    // else clean it up
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

function normalizeToHomeDirePath(val, config) {

    let home_dir = config.hasOwnProperty("home_dir") ? config.home_dir : config;
    home_dir = cleanPath(home_dir);
    if (!home_dir || home_dir === "" || home_dir === " " || home_dir === ".") {
        home_dir = ' '; // <-- this is space dont change this 
    }

    let parsed_dir = val;
   
    if (parsed_dir.indexOf(home_dir) >= 0) {
        parsed_dir = path.join.apply(null, parsed_dir.split(home_dir));
    }

    if (parsed_dir.startsWith(home_dir)) {
        parsed_dir = parsed_dir.split(home_dir)[1];
    }

    return parsed_dir;
}

function removeBase(base, target) {
    var base_path = cleanPath(base);

    var target_path = target;
    if (base_path == '.')
        target_path = target;
    else if (target.indexOf(base_path) >= 0)
        target_path = target.split(base_path)[1]

    if (!target_path.startsWith('/')) {
        target_path = '/' + target_path;
    }
    return target_path;
}

function addBase(base, target) {
    return path.join(base, target);
}

function fileContents(file_path) {
    if(!isFile(file_path)) {
        if(isFile(path.join(file_path, 'index.md'))) {
            file_path = path.join(file_path, 'index.md');
        } else {
            return null;
        }
    }
    var content = safe.fs.readFileSync(file_path)
    if(!content) {
        debug(`There is a error ${safe.error} reading a file ${file_path}`);
        return null;
    }
    
    var content_fm = fm(content.toString());
    var mark = content_fm.body;
    var html = markdown(mark)
    return {
        makrdown : mark,
        contents: html
    }
}

function buildDirPath(file_path, config = null, normalize = true) {
    
    if (file_path.endsWith("index.md")) {
        file_path = file_path.slice(0, file_path.indexOf('index.md'));
    }
    if(file_path.endsWith('.md')) {
        file_path = file_path.slice(0, file_path.indexOf('.md'));        
    }

    let build_path = removeBase(config.documents_dir, file_path)
    // normalize path for the home directory
    build_path = normalizeToHomeDirePath(build_path, config);
    build_path = path.join(config.build_dir, build_path);
    return build_path;

    /////////////////////////////////
    /*let base = path.normalize(config.documents_dir);
    let parsed_dir = file_path;

    if (normalize) {
        // val.split(base)[1];
        parsed_dir = normalizePath(parsed_dir, config);
    }

    let parsed = path.parse(parsed_dir);
    
    // let build_path = path.join('build', removeBase(config.documents_dir, parsed.dir), parsed.name);
    let build_path = removeBase(config.documents_dir, path.join(parsed.dir, parsed.base));
    build_path = path.join('build', build_path);

    return build_path;*/
}

function fileToUrl(val) {
    val = normalizePathForJP(val).slice(1);

    let url = val.split('.')[0]

    return url;
}

function fileMeta(val, config, documents_dir) {
    let fd = fs.openSync(val, 'r');
    let file_conent = fs.readFileSync(fd);
    let file_stats = fs.fstatSync(fd);
    fs.close(fd);

    let file_fm = fm(file_conent.toString());
    let description = file_fm.attributes.description
        || file_fm.body.toString().split(' ').slice(0, 25).join(' ').split('\n').join(' ');

    file_fm.attributes.description = markdown(description);
    file_fm.attributes.raw_description = description;

    let file_meta = file_fm.attributes;
    file_meta["__type__"] = 'file';
    file_meta["__path__"] = val;
    file_meta["__fstat__"] = file_stats;

    let slug = file_fm.slug ? file_fm.slug: path.basename(val);
    let keywords = config['__key_words__']
    if(keywords.indexOf(slug) >= 0) {
        slug = `${slug}-articles`;
    }
    let _path = path.join(path.parse(val).dir, slug);
    let url_path = removeBase(documents_dir, _path);
    url_path = removeBase(config.home_dir, url_path);
    file_meta["url"] = fileToUrl(url_path);

    return file_meta;
}
