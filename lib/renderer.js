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
        this.config = config;
        this.meta = meta;
        this.taxonomy_pool = Object.keys(meta.taxonomy)
                                       .reduce(function(acc, key){
                                        let pool = Object.keys(meta.taxonomy[key]);
                                        acc[key] = pool;
                                        return acc;
                                    }, {});

        debug('this is taxonomy pool ', this.taxonomy_pool)
    }

    themeConfig(fn) {
        this.theme = fn(this.config, handlebars);
    }

    render() {
        console.time(`Rendeing done`);
        
        let theme = this.theme;
        let config = this.config;
        let meta = this.meta;
        let taxonomy_pool = this.taxonomy_pool;

        renderTree();
        renderTaxonomy();
        // renderSitemap();
        // renderAssets();

        function renderTree() {
            let tree = meta.tree;
            Object.keys(tree).forEach(function(key){
                // Process key                
                if(tree[key].hasOwnProperty('__type__')) {
                    renderFile(tree[key])
                } else {
                    // if not __type__ means it's directory
                    renderDir(tree[key], key)
                }
            })
        }

        function renderTaxonomy() {
            let taxonomy = config.taxonomy;
            let meta_taxonomy = meta.taxonomy;
            debug(`taxonomy - ${taxonomy}`);
            taxonomy.forEach(function(key){
                let current_type = meta_taxonomy[key];
                Object.keys(current_type).forEach(function(item){
                    let current_path = path.join(key, item);
                    renderDir(current_type[item], current_path, true);
                })
            })
        }

        function renderFile(file_obj, index = null) {
            let file_path = file_obj['__path__'];
            if(path.basename(file_path).indexOf('index.md')>=0) {
                // Because this is index.md file lets handle it in renderDir 
                // Reason being it can have index
                return;
            }
            // create context
            let context = {};
            context['site'] = config.site;
            context = Object.assign(context,meta.plugins);
            context = Object.assign(context,file_obj);
            context['taxonomy_pool'] = taxonomy_pool;
            debug(`context ${JSON.stringify(context)}`);
            let file_contents = utils.fileContents(file_path);
            context = Object.assign(context, file_contents)
            context['index'] = index ? index : null;
            let html = theme[file_obj.layout](context);
            let build_path = utils.buildDirPath(file_path, config)
            mkdirp(build_path);
            let index_file = path.join(build_path, 'index.html');
            // if(index)
            //     debug(`${file_path} layout ${file_obj.layout} build_path ${build_path} index-file ${index_file} - html ${html}`);
            fs.writeFileSync(index_file, html);
        }

        function renderDir(dir_obj, name, taxonomy = false) {
            let current_index = {};
        
            if(taxonomy){
                current_index['index'] = jp.get(meta.taxonomy, utils.normalizePathForJP(name));
                // debug(`Current taxonomy ${name} - current index - ${JSON.stringify(current_index)}`);
            } else {
                current_index = jp.get(meta.indexes, utils.normalizePathForJP(name));
            }
            // lets first render all the indexing stuff then go for the individial pages 
            let title = path.basename(name);
            let file_path = path.join(config.documents_dir, name);
            if(Array.isArray(current_index.index)) {
                let layout = `${title}-index`;
                if(!theme[layout]) {
                    layout = config.default_index_layout;
                }
                let file_obj = {
                    'title': title,
                    'slug': title,
                    '__path__':file_path,
                    'layout':layout
                }
                renderFile(file_obj, current_index.index);
            } else {
                Object.keys(current_index.index).forEach(function(key){
                    let layout = `${title}-index`;
                    if(!theme[layout]) {
                        layout = config.default_index_layout;
                    }
                    // let file_path = path.join(config.documents_dir, name);
                    if(key !=='0') {
                        file_path = path.join(file_path,'page', key);
                    }
                    let file_obj = {
                        'title': title,
                        'slug': title,
                        '__path__':file_path,
                        'layout':layout
                    }

                    renderFile(file_obj, current_index.index[key]);
                })
            }
            if(!taxonomy){
                // just dont even attempt if its taxonomy
                Object.keys(dir_obj).forEach(function(key) {
                    let current_path = path.join(name, key);
                    if(dir_obj[key].hasOwnProperty('__type__')){
                        renderFile(dir_obj[key])
                    } else {
                        renderDir(dir_obj[key], current_path, taxonomy)
                    }
                })
            }
        }

        console.timeEnd(`Rendeing done`);        
    }

    /*render() {
        console.time(`Rendeing done`);

        let theme = this.theme;
        let config = this.config;
        let meta = this.meta;
        let processed_object = [];
        let site_map_url_list = new Set();
        let current_time = new Date().toISOString();
        let taxonomy_obj = meta.taxonomy;
        let taxonomy_list = config.taxonomy;

        processTree(meta.tree, '.');

        // process taxonomy
        processTaxonomy(taxonomy_obj, taxonomy_list);
        // TODO: process rendering related plugins on processed_object
        if(config.process_obj_tree){
            fs.writeFileSync('./process_obj_tree.json', JSON.stringify(processed_object, null, 4));
        }

        processed_object.forEach(function (obj) {
            renderObject(obj);
        });
        // Move assets to build dir
        let assets_dir = config.site_assets;
        let base_dir = path.dirname(config.documents_dir);
        let assets_dir_name = assets_dir.split(base_dir)[1];
        let assets_build_dir = path.join(config.build_dir,  assets_dir_name);
        utils.copyDir(assets_dir, assets_build_dir);
       
        site_map_url_list.add({loc:"",lastmod:current_time})
        // processSiteMap(site_map_url_list);

        function processSiteMap(map_set) {
            let sitemap_file = path.join(config.build_dir, config.documents_dir, "sitemap.xml");
            let xml_url = "";
            map_set.forEach(function(item) {
                xml_url +=`\t<url>\n\t<loc>${config.site.base_domain}/${item.loc}</loc>\n\t<lastmod>${item.lastmod}</lastmod>\n\t</url>\n` 
            });
            let site_map =`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${xml_url}\n</urlset>`
            fs.writeFileSync(sitemap_file, site_map);
        }

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

        function processTree(obj, name) {
            Object.keys(obj).forEach(function (key) {
                let current_path = path.join(name, key);
                processPath(current_path);
                if (!obj[key]['__type__'])
                    processTree(obj[key], current_path);
            })
        }
        
        function processPath(file_location) {
            let location = utils.addBase(config.documents_dir, file_location)
            if (utils.isFile(location)) {
                if (location.endsWith('index.md')) {
                    return;
                }
                processed_object.push(getFileObject(location));
            } else if (utils.isDirectory(location)) {
                
                // location = utils.normalizePathForJP(location);
                
                debug('currently processing this dir ', location, " for ", config.documents_dir)
                // if(!location.startsWith( config.documents_dir)) {
                //     // generate the index files only for the directories inside documents_dir
                //     return;
                // }

                let obj = {
                    site:null,
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

                // TODO pagination drama :)
                let index_list = jp.get(meta.indexes, utils.normalizePathForJP(utils.removeBase(config.documents_dir, location)));
                if(Array.isArray(index_list.index)) {
                    addToObjects(obj, index_list.index, location)
                } else {
                    let indexes = index_list.index;
                    Object.keys(indexes).forEach(function(key) {
                        let obj_local = Object.assign({}, obj);
                        let name = path.basename(location);
                        let obj_location = location;
                        if(key != '0') {
                            obj_location = path.join(location, key);
                        }
                        debug("obj_local ", obj_local,  " obj_location ", obj_location, " name ", name)
                        addToObjects(obj_local, indexes[key], obj_location, name);
                    })
                }

                function addToObjects(obj_local, list, location, name = null) {
                    obj_local.index = list
                    let basename = name ? name : path.basename(location);

                    if(!obj_local.layout) {
                        let layout = `${basename}-index`;
                        if (!theme[layout]) {
                            layout = config.default_layout;
                        }
                        obj_local.layout = layout;
                    } 
                    if(!obj_local.meta) {
                        obj_local.meta = {
                            title: basename,
                            slug: basename.toLowerCase()
                        };
                    }

                    if(!obj_local.path) {
                        obj_local.path = location;
                    }
                    obj_local.build_path = utils.pathToBuildDir(location, config);
                    obj_local.site = config.site;
                    obj_local.plugins = meta.plugins;

                    processed_object.push(obj_local);
                }
                // if(obj.indexes is array) then just go with the list 
                // but if its not then there are pages and make sure 0 == index (no directory name '0')
                // obj.posts = index_list.index;
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
                site: config.site,
                meta: _meta,
                contents: html,
                markdown: markdown,
                build_path: build_path,
                path: location,
                layout: layout,
                plugins: meta.plugins
            }
        }

        function renderObject(obj) {
            let context = {};
            context = Object.assign(context, obj.meta);
            context = Object.assign(context, obj.plugins);
            context['site'] =  obj.site;
           
            context['contents'] = obj.contents;

            if(obj.index) {
                context['index'] = obj.index;
            }
            let html = theme[obj.layout](context);
            mkdirp(obj.build_path);

            if(obj.meta.url != undefined) {
                site_map_url_list.add({loc:obj.meta.url,lastmod:obj.meta.published_at.toISOString()});
            }

            fs.writeFileSync(path.join(obj.build_path, 'index.html'), html);
        }

        console.timeEnd(`Rendeing done`);

    }*/

}

module.exports = Renderer;
