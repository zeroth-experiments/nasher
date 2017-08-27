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
    }

    themeConfig(fn) {
        this.theme = fn(this.config, handlebars);
    }

    render() {
        // console.time(`Rendeing done`);

        let theme = this.theme;
        let config = this.config;
        let meta = this.meta;
        let taxonomy_pool = this.taxonomy_pool;

        renderTree();
        renderTaxonomy();
        renderSitemap();
        renderAssets();
        // console.timeEnd(`Rendeing done`);

        function renderTree() {
            // console.time(`Tree Rended`);

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

            // console.timeEnd(`Tree Rended`);
        }

        function renderTaxonomy() {
            // console.time(`Taxonomy Rended`);

            let taxonomy = config.taxonomy;
            let meta_taxonomy = meta.taxonomy;
            // debug(`taxonomy - ${taxonomy}`);
            taxonomy.forEach(function(key){
                let current_type = meta_taxonomy[key];
                Object.keys(current_type).forEach(function(item){
                    let current_path = path.join(key, item);
                    renderDir(current_type[item], current_path, true);
                })
            })
            // console.timeEnd(`Taxonomy Rended`);
        }

        function renderSitemap() {
            // console.time(`Sitemap Rended`);

            let buld_dir_glob = glob.sync(path.join(config.build_dir, '!(assets)/**/*.html'));
            let site_map_header = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;
            let site_map_body = `<url>\n\t<loc>${config.site.base_domain}/</loc>\n\t<lastmod>${new Date().toISOString()}</lastmod>\n</url>`;
            let normalized_build_path = path.normalize(config.build_dir)
            buld_dir_glob.forEach(function(file_path) {
                // TODO: improve the statSync way of getting the last modified time
                // May be checksum ??
                let lastmod = fs.statSync(file_path).ctime.toISOString();
                file_path = path.dirname(file_path);
                let uri = file_path.replace(normalized_build_path, '');
                site_map_body += `<url>\n\t<loc>${path.join(config.site.base_domain,uri)}/</loc>\n\t<lastmod>${lastmod}</lastmod>\n</url>`
            })
            let site_map_footer =`</urlset>`;

            let site_map = `${site_map_header}\n ${site_map_body} \n${site_map_footer}`;
            fs.writeFileSync(path.join(config.build_dir, 'sitemap.xml'), site_map);
            // console.timeEnd(`Sitemap Rended`);
        }

        function renderAssets() {
            // console.time(`Aseets copyed`);
            let assets_dir = config.site_assets;
            let assets_dir_name = path.basename(assets_dir);
            let assets_build_dir = path.join(config.build_dir,  assets_dir_name);
            utils.copyDir(assets_dir, assets_build_dir);
            // console.timeEnd(`Aseets copyed`);
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
            // debug(`context ${JSON.stringify(context)}`);
            let file_contents = utils.fileContents(file_path);
            context = Object.assign(context, file_contents)
            context['index'] = index ? index : null;
            let html = theme[file_obj.layout](context);
            let build_path = utils.buildDirPath(file_obj, config)
            mkdirp(build_path);
            let index_file = path.join(build_path, 'index.html');

            fs.writeFileSync(index_file, html);
        }

        function renderDir(dir_obj, name, taxonomy = false) {
            let current_index = {};

            if(taxonomy){
                current_index['index'] = jp.get(meta.taxonomy, utils.normalizePathForJP(name));
            } else {
                current_index = jp.get(meta.indexes, utils.normalizePathForJP(name));
            }
            // lets first render all the indexing stuff then go for the individial pages
            let title = path.basename(name);
            let file_path = path.join(config.documents_dir, name);
            let default_path = file_path;
            if(Array.isArray(current_index.index)) {
                let layout = `${title}-index`;
                if(!theme[layout]) {
                    layout = config.default_index_layout;
                }
                let file_obj = {
                    'title': title,
                    '__path__':file_path,
                    'layout':layout,
                    'slug': title.toLowerCase()
                }
                renderFile(file_obj, current_index.index);
            } else {
                Object.keys(current_index.index).forEach(function(key, key_index, arr) {

                    let layout = `${title}-index`;
                    if(!theme[layout]) {
                        layout = config.default_index_layout;
                    }

                    if(key !=='0') {
                        file_path = path.join(file_path,'page', key);
                    }

                    let paginate = {
                        'current_page': key_index
                    }

                    if(key_index+1 != arr.length) {
                        // this is not the last page
                        paginate['next_page'] = key_index+1;
                        paginate['next_page_url'] =  path.join('/',utils.fileToUrl(default_path, config), 'page', `${key_index+1}`)
                        paginate['next'] = true;
                    } else {
                        paginate['next_page'] = false;
                        paginate['next'] = false;
                    }

                    if(!(key_index - 1 < 0)) {
                        // this is not 1st page
                        paginate['previous_page'] = key_index-1;
                        paginate['previous_page_url'] =  (key_index-1) == 0 ? path.join('/', utils.fileToUrl(default_path, config)):
                                                                            path.join('/', utils.fileToUrl(default_path, config), 'page', `${key_index-1}`)
                        paginate['previous'] = true;
                    } else {
                        paginate['previous_page'] = false;
                        paginate['previous'] = false;
                    }
                    debug(' Slug for ', title, ' is ', title.toLowerCase());
                    let file_obj = {
                        'title': title,
                        'slug': title.toLowerCase(),
                        '__path__':file_path,
                        'layout':layout,
                        'paginate': paginate,
                        '__default_path__':default_path
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

    }

}

module.exports = Renderer;
