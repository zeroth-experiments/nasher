'use strict';

const Console = require('console').Console;


const colors = require('colors');
colors.setTheme({
  info: 'green',
  help: 'cyan',
  warn: 'yellow',
  debug: 'blue',
  error: 'red',
  default: 'white'
});

module.exports = function logger(namespace, output=process.stdout, error=process.stderr) {
    const stconsole = Console(output, error);
    namespace = namespace.toUpperCase().trim();
    switch(namespace) {
        case 'INFO': 
            namespace = namespace.info;
            break;
        
        case 'HELP': 
            namespace = namespace.help;
            break;
        case 'WARN': 
            namespace = namespace.warn;
            break;
        case 'DEBUG': 
            namespace = namespace.debug;
            break;
        case 'ERROR': 
            namespace = namespace.error;
            break;
        default:
            namespace = namespace.default;
            break;
    }
    return stconsole.log.bind(console, namespace+"\t");
}
