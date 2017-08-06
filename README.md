# Nasher
Yet another static site generator written in NodeJs.

Nasher is my 2nd attempt in making Static-Site-Generator. 

The idea behind Nasher is to build an extensible system which can be easily extended via plugins which can modify the output to include additional features (such as seo optimization, embedding of dynamic features such as Disqus comments,  Sliders  ) 

Out of the box Nasher support converting of  *Markdown* files to *HTML*  and supports Handlebars as a templating language.


Nasher works in 4 main stages 
```
|----------|     |---------|     |----------|    |----------|
| Analyze  |---->| Apply   |---->| Convert  |--->| Render   |
|          |     | Plugins |     | Markdown |    | using    |
|          |     |         |     |   to     |    | templates|
|          |     |         |     |          |    |  HTML    |    
|----------|     |---------|     |----------|    |----------|
```

Nasher is designed in such a way that it is easy it integrate with other projects. 

Let's have a look at how to use nasher.

Step 1) Install Nasher Package

```
   npm install nasher --save
```

Step 2) Create a config.json file

Basic structure:
```
{
   "site": {
       "title": 'My Site'
   },
   "baseurl": "/",
   "documents_dir": './documents',
   "home_dir": '.',
   "build_dir": './build',
   "theme_dir": './theme',
   "default_layout": 'index',
   "site_assets":"./assets",
   "process_tree":false
   "process_tree": true,
  
   "theme_dir": "./theme",
   "site_assets":"./assets",
   "paginate" : {
       "limit": -1,
       "<name of the list>": {
           "sortBy":"date",
           "create_index": false
       }
   }
}
```

Step 3 Create runner.js(name of the file can be anything) file
Basic Example:
```
const {Nasher} = require('nasher');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
let nasher = new Nasher('./config.json');

nasher.plugin(function (config, meta, files) {
   ...
});

nasher.theme(function theme(config, engine) {
   // for now consider we are sticking to handlebars
   let theme_dir = config.theme_dir;
   let theme_main_files = glob.sync(path.join(theme_dir, '!(partials|scripts|css)'));
   let theme_partials_files = glob.sync(path.join(theme_dir, 'partials', '*'));
   let theme_helpers_files = glob.sync(path.join(theme_dir, 'scripts', '*.js'));
  
   let theme_partials = theme_partials_files.reduce(function (acc, val) {
       let content = fs.readFileSync(val);
       let partial_name = path.basename(val, '.hbs');
       acc[partial_name] = content.toString();
       return acc;
   }, {});

   let theme_helpers = theme_helpers_files.reduce(function (acc, val) {
       let content = require(path.join(process.cwd(), val));
       let partial_name = path.basename(val, '.js');
       acc[partial_name] = content;
       return acc;
   }, {});


   Object.keys(theme_helpers).forEach(function (key) {
       engine.registerHelper(key, theme_helpers[key]);
   });

   Object.keys(theme_partials).forEach(function (key) {
       engine.registerPartial(key, theme_partials[key]);
   });

   return theme_main_files.reduce(function (acc, val) {
       let content = fs.readFileSync(val).toString();
       let template_name = path.basename(val, '.hbs');
       acc[template_name] = engine.compile(content);
       return acc;
   }, {});
});

nasher.build();

```

To see a live example of Nasher in action, have look at the [zeroth.me](https://zeroth.me) website. 
You can have a look at the code here [https://github.com/zeroth-experiments/zeroth.me](https://github.com/zeroth-experiments/zeroth.me)


