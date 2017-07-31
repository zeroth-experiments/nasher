'use strict';
const mkdirp = require('mkdirp').sync;
const path = require('path');
const fs = require('fs');
const jp = require('json-pointer');
const glob = require('glob');
const handlebars = require('handlebars');
const consolidate = require('consolidate');


const utils = require('./util');
const logger = require('./logger');
const info = logger('info');
const debug = logger('debug');
const show = logger('warn');
// handlebars.registerPartial()
const spawn = require('child_process').spawn;

function contents(array, check) {
    let isValid = (obj)=> obj.path === check;
    return (array.findIndex(isValid)) < 0 ? 0:1;
}

class Renderer {
    constructor(meta, config) {
        debug("renderer start");
        // spawn('rm', ['-rf', path.join('build')]);
        this.config = config;
        this.meta = meta;
    }

    themeConfig(fn) {
        this.theme = fn(this.config, handlebars);
    }

    render() {
        console.time(`Rendeing done`);

        let theme = this.theme;
        let config = this.config;
        let meta = this.meta;
        let processed_object = [];
        
        let taxonomy_obj = meta.taxonomy;
        let taxonomy_list = config.taxonomy;

        processTree(meta.tree, '.');

        // process taxonomy
        processTaxonomy(taxonomy_obj, taxonomy_list);
        // TODO: process rendering related plugins on processed_object
        // fs.writeFileSync('./process_obj_tree.json', JSON.stringify(processed_object, null, 4));

        processed_object.forEach(function (obj) {
            renderObject(obj);
        });

        // Move assets to build dir
        let assets_dir = config.site_assets;
        let base_dir = path.dirname(config.documents_dir);
        let assets_dir_name = assets_dir.split(base_dir)[1];
        let assets_build_dir = path.join(config.build_dir, config.documents_dir, assets_dir_name);
        debug("Asset dir : ", base_dir," -- ", assets_build_dir)
        utils.copyDir(assets_dir, assets_build_dir);
       

        function processTaxonomy(obj, list) {
            list.forEach(function(item){
                if(obj[item]) {
                    let current_item  = obj[item];
                    Object.keys(current_item).forEach(function(key){
                        processTaxonomyItem(current_item[key], item, key);
                    })
                }
            })
        }

        function processTaxonomyItem(obj, parent, child) {
            Object.keys(obj).forEach(function(key){
                let c = path.join(parent, child, key);
            })
        }

        function renderObject(obj) {
            let context = {};
            context = Object.assign(context, obj.meta);
            context = Object.assign(context, obj.plugins);
            context['contents'] = obj.contents;
            if(obj.indexes) {
                context['indexes'] = obj.indexes;
            }

            if(obj.posts) {
                context['posts'] = obj.posts;
            }
            let html = theme[obj.layout](context);
            mkdirp(obj.build_path);
            fs.writeFileSync(path.join(obj.build_path, 'index.html'), html);
        }

         function processTree(obj, name) {
            Object.keys(obj).forEach(function (key) {
                let current_path = path.join(name, key);
                processPath(current_path);
                if (!obj[key]['__type__'])
                    processTree(obj[key], current_path);
            })
        }
        
        function processPath(location) {
            if (utils.isFile(location)) {
                if (location.endsWith('index.md')) {
                    return;
                }
                processed_object.push(getFileObject(location));
            } else if (utils.isDirectory(location)) {
                
                location = utils.normalizePathForJP(location);

                if(!location.startsWith( utils.normalizePathForJP(config.documents_dir))) {
                    // generate the index files only for the directories inside documents_dir
                    return;
                }

                let obj = {
                    meta: null,
                    contents: null,
                    markdown: null,
                    build_path: null,
                    path: null,
                    layout: null,
                    plugins: null
                };

                if (utils.isFile(path.join(location, 'index.md'))) {
                    obj = Object.assign(obj, getFileObject(path.join(location, 'index.md')));
                }

                let index_list = jp.get(meta.indexes, utils.normalizePathForJP((location)));
                obj.indexes = index_list.index;
                let posts = jp.get(meta.tree, utils.normalizePathForJP((location)));
                obj.posts = posts;

                let basename = path.basename(location);
                if(!obj.layout) {
                    let layout = `${basename}-index`;
                    if (!theme[layout]) {
                        layout = config.default_layout;
                    }
                    obj.layout = layout;
                } 
                if(!obj.meta) {
                    obj.meta = {
                        title: basename
                    };
                }

                if(!obj.path) {
                    obj.path = location;
                    obj.build_path = utils.pathToBuildDir(location, config);
                }

                processed_object.push(obj);
            }
        }

        function getFileObject(location, is_index = false) {
            let file_obj = utils.fileObj(location, config.home_dir, config.documents_dir);
            let _meta = file_obj.meta;
            let layout = config.default_layout;
            if (_meta.layout) {
                layout = _meta.layout.split(".")[0];
            }
            let html = file_obj.body;
            let markdown = file_obj.markdown;

            let build_path = utils.pathToBuildDir(location, config);

            return {
                meta: _meta,
                contents: html,
                markdown: markdown,
                build_path: build_path,
                path: location,
                layout: layout,
                plugins: meta.plugins
            }
        }


        console.timeEnd(`Rendeing done`);

    }

}

module.exports = Renderer;
