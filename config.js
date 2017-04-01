var path = require("path");
var fs = require("fs");
var _ = require('lodash');

module.exports = (function() {
    var defaults = require('./default_config.js');
    // Load custom config
    var config = {};
    _.merge(config, defaults);

    var localConfig = './_config.js';

    if (fs.existsSync(localConfig))
    {
        var c = require(localConfig);
        _.merge(config, c);
    }

    // Override some config vars using environment
    if (process.env.GITLAB_URL)
        config.gitlab.url = process.env.GITLAB_URL;
    if (process.env.DEPLOY_BRANCH)
        config.deploy.deployBranch = process.env.DEPLOY_BRANCH;
    if (process.env.DEPLOY_PAGEDIR)
        config.deploy.publicPagesDir = process.env.DEPLOY_PAGEDIR;
    if (process.env.SERVER_URL)
        config.server.publicUrl = process.env.SERVER_URL;

    return config;
})();
