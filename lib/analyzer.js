'use strict';

const utils = require('./util');
const path = require('path');
const glob = require('glob');
const fs = require('fs');
const fm = require('front-matter');
const jp = require('json-pointer');
const promise = require('bluebird');

const logger = require('./logger');
const info = logger('info');
const debug = logger('debug');
function sortDate(a, b) {

    let a_date = null;
    let b_date = null;
    if (a.published_at) {
        a_date = a.published_at;
    } else {
        a_date = a['__fstat__'].birthtime;
    }
    if (b.published_at) {
        b_date = b.published_at;
    } else {
        b_date = b['__fstat__'].birthtime;
    }

    return new Date(b_date) - new Date(a_date);

}
function arrayToObject(arr, limit = 10, sorting = null) {
    let array = arr;
    //TODO: sorting based on config
    let result = {};
    if(limit <= 0 ) {
        result = array.sort(sortDate);
        return result;
    }
    for (let i = 0; array.length; i++) {
        let r = array.splice(0, limit);
        result[i] = r.sort(sortDate);
    }
    return result;
}

class Analyzer {
    constructor(config) {

        console.time(`Tree created`);
        this._meta = {};
        this.config = config;
        if (jp.has(this.config, '/documents_dir')) {
            this.populateTree(this.config.documents_dir);
        }
        if (jp.has(this.config, '/taxonomy')) {
            this.populateTaxonomyIndex(this.config.taxonomy);
        }
        this.populatePageIndex(this.config);
        console.timeEnd(`Tree created`);
        debug("total pages : ", this._meta.glob.length);
    }

    get meta() {
        return this._meta;
    }

    populateTree(documents_dir) {

        let tree = {};
        let base_path = documents_dir;
        let pattern = path.join(base_path, '/**/*.md');
        let files = glob.sync(pattern);
        this._meta['glob'] = files;
        let config = this.config;
        files.forEach(function (file) {
            let current = tree;
            let file_meta = utils.fileObj(file, config.home_dir, config.documents_dir).meta;
            jp.set(current, "/" + file, file_meta);

        })

        this._meta['tree'] = tree;

    }

    populateTaxonomyIndex(taxonomy) {
        let glob = this._meta.glob;
        let tree = this._meta.tree;
        this._meta['taxonomy'] = {};
        let taxonomyObj = this._meta.taxonomy;

        taxonomy.forEach(function (item) {
            let tax_item_tree = taxonomyObj[item] = {};
            glob.forEach(function (file) {
                let check = '/' + file + '/' + item;
                if (jp.has(tree, check)) {
                    // get the value for that 
                    let tItem = jp.get(tree, check);
                    if (!Array.isArray(tItem)) {
                        tItem = [tItem];
                    }
                    tItem.forEach(function (subtItem) {
                        let tItem_path = "/" + subtItem;
                        let f = jp.get(tree, "/" + file)
                        if (jp.has(tax_item_tree, tItem_path)) {
                            let ar = jp.get(tax_item_tree, tItem_path);
                            ar.push(f);
                            ar = ar.sort(sortDate)
                        } else {
                            jp.set(tax_item_tree, tItem_path, [f]);
                        }
                    })

                }
            })
        });

        makePagination(taxonomyObj)
        function makePagination(obj){
            Object.keys(obj).forEach(function(key){
                if(Array.isArray(obj[key])) {
                    obj[key] = arrayToObject(obj[key]);
                } else {
                    makePagination(obj[key]);
                }
            })
        }
    }

    populatePageIndex(config) {

        let limit = 5; // get it form config
        let base_path = config.documents_dir;
        let tree = this._meta.tree;

        let indexes = {};
        let root_path = utils.normalizePathForJP(base_path);
        let documents_obj = jp.get(tree, root_path);
        function createIndex(obj) {
            let local_indexes = {};
          
            let index_array = indexList(obj);
            // sort index_array 
            index_array = index_array.sort(sortDate);

            local_indexes["index"] = arrayToObject(index_array, config.paginate.limit||10);
            Object.keys(obj).forEach(function (key) {
                if (!obj[key]["__type__"])
                    local_indexes[key] = createIndex(obj[key]);
            })
            return local_indexes;
        }

        let _indexes = {};
        _indexes = createIndex(tree);

        this._meta["indexes"] = _indexes;

        

        function indexList(obj) {
            let current_obj = {};
            let result = [];

            function indexProxy(_obj) {
                let r = [];
                Object.keys(_obj).forEach(function (key) {
                    if (_obj[key]['__type__'] != 'file') {
                        r = r.concat(indexProxy(_obj[key]));
                    } else {
                        r.push(_obj[key])
                    }
                })
                return r;
            }
            return indexProxy(obj);
        }
    }

}

module.exports = Analyzer;