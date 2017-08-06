module.exports = {
    "site": {
        "title": 'My Site'
    },
    "baseurl": '/',
    "taxonomy": ['category', 'tags'],
    "documents_dir": './documents',
    "home_dir": '.',
    "build_dir": './build',
    "theme_dir": './theme',
    "theme_config": {},
    "default_layout": 'index',
    "site_assets":"./assets",
    "main_tree": false,
    "process_obj_tree":false,
    "paginate" : {
        "limit": -1,
        "articles": {
            "sortBy":"date",
            "create_index": false
        }
    },

}

/**
 * TODO: hooks
 * after before hooks for everything
 */