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

    "pagination" : {
        "limit": 10,
        "dir" : {
            "posts": {
                "sortBy":"date",
                "create_index": true
            }
        },
        "taxonomy": {
            "tags": {
                "sortBy":"date",
                "create_index": true
            },
            "category": {
                "sortBy":"date",
                "create_index": true
            },
            "_default_": {
                "sortBy":"date",
                "create_index": true
            }
        }
        
    },

}

/**
 * TODO: hooks
 * after before hooks for everything
 */