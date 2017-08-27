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
    "default_layout": 'page',
    "default_index_layout": 'index',
    "site_assets":"./assets",
    "debug": false,
    
    "pagination" : {
        "limit": 10,
        "dir" : {
            "posts": {
                "sortBy":"date",
                "paginate": true
            },
            "_default_": {
                "sortBy":"date",
                "paginate": true
            }
        },
        "taxonomy": {
            "tags": {
                "sortBy":"date",
                "paginate": true
            },
            "category": {
                "sortBy":"date",
                "paginate": true
            },
            "_default_": {
                "sortBy":"date",
                "paginate": true
            }
        }
        
    }

}

/**
 * TODO: hooks
 * after before hooks for everything
 */