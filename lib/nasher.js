/**
 * default configuration
 * {
 *     "title": 'My Site',
 *     "taxonamy": ['catagory', 'tags'],
 *     "documents_dir": './docs',
 *     "build_dir": './build',
 *     "theme_dir": './theme',
 *     "theme_config": {},
 *     "navvigation": {
 *         "Home": '/'
 *     }
 * }
 * 
 */
'use strict';

const fs = require('fs');
const jp = require('json-pointer');
const path = require('path');
const Analyzer = require('./analyzer');
const Renderer = require('./renderer');
const utils = require('./util');
const logger = require('./logger');
const info = logger('info');
const debug = logger('debug');

class Nasher {
    constructor(configFile = null) {
        this.config = require('./default');
        
        
        this.plugins = [];
        if (typeof configFile === 'string') {
            if (utils.isFile(configFile)) {
                this.config = Object.assign(this.config, require(path.join(process.cwd(),configFile)));
            } else {
                this.config = Object.assign(this.config, configFile);
            }
        }
        
        // basic check 
        if (!utils.isDirectory(path.join(process.cwd(),this.config.documents_dir))) {
            throw new Error(`${this.config.documents_dir} is not a valid directory`);
        }
        if (!utils.isDirectory(path.join(process.cwd(),this.config.theme_dir))) {
            throw new Error(`${this.config.theme_dir} is not a valid directory`);
        }
        
        
        this.config['__key_words__'] = Array.isArray(this.config.taxonomy)? 
                                        this.config.taxonomy.concat(this.config.taxonomy, 'page'):
                                        [this.config.taxonomy].concat(this.config.taxonomy, 'page');

        info("Configiration : ",this.config);
        this.config.debug = process.env.NASHER_DEBUG;
        // go analyze
        let analysis = new Analyzer(this.config);
        this.meta = analysis.meta;
        this.meta['plugins'] = {};
    }

    plugin(fn) {
        this.plugins.push(fn);
        return this;
    }

    theme(fn) {
        // some how pass the theme to renderer
        this._theme = fn;
    }

    build(){
        console.time('Nasher Created');
        // let documents_obj = jp.get(this.meta.tree, root_path);
        for(let i=0; i < this.plugins.length; i++) {
            this.plugins[i](this.config, this.meta.plugins, this.meta.tree);
        }
        
        if(this.config.debug){
            fs.writeFileSync('./tree.json', JSON.stringify(this.meta, null, 4));
        }
        
        this.renderer = new Renderer(this.meta, this.config);

        this.renderer.themeConfig(this._theme);
        this.renderer.render();
        
        console.timeEnd('Nasher Created');
        
        // this.renderer.init(this.analysis._meta);
    }
}

module.exports = Nasher;