var express = require('express');
var router = express.Router();
var config = require('../config');
var NodeGit = require("nodegit");
var path = require("path");
var fs = require('fs');
var _ = require('lodash');
var rmdir = require('rimraf');
var mv = require('mv');
var exec = require('child_process').exec;
var debug = require('debug')('routes:webhooks');
var yaml = require('yamljs');
var promixify = require('promisify-node');
var ncp = require('ncp').ncp;

/* POST  */
router.post('/pages.json', function (req, res, next) {
    debug('>>>>>> /pages.json');
    var payload = req.body;
    // debug(payload);
    var userId = payload.user_id;
    var projectId = payload.project_id;
    // debug('pages', userId, projectId);
    var afterCommit = payload.after;
    var ref = payload.ref;

    // Check if this is the deploy branch
    var deployRef = "refs/heads/" + config.deploy.deployBranch;
    debug('deploy ref: ' + deployRef + ', ref: ' + ref);
    if (ref !== deployRef) {
        // debug(ref, deployRef);
        //return res.end();
    }

    // var opts = {
    //     certificateCheck: function() {
    //         return 1;
    //     },
    //     // ignoreCertErrors: 1,
    //     credentials: function(url, userName) {
    //         return NodeGit.Cred.sshKeyFromAgent(userName);
    //         // return NodeGit.Cred.sshKeyNew(
    //         //     userName,
    //         //     config.deploy.sshPublicKey,
    //         //     config.deploy.sshPrivateKey,
    //         //     "");
    //     }
    // };

    var opts = {
        ignoreCertErrors: 1,
        remoteCallbacks: {
            credentials: function (url, userName) {
                return NodeGit.Cred.sshKeyNew(
                    userName,
                    config.deploy.sshPublicKey,
                    config.deploy.sshPrivateKey,
                    "");
            }
        }
    };

    var cloneOptions = {
        checkoutBranch: config.deploy.deployBranch,
        fetchOpts: {
            callbacks: {
                certificateCheck: function () {
                    return 1;
                },
                credentials: function (url, userName) {
                    return NodeGit.Cred.sshKeyNew(
                        userName,
                        config.deploy.sshPublicKey,
                        config.deploy.sshPrivateKey,
                        "");
                }
            }
        }
    };

    var repository = payload.repository;
    var url = repository.url;
    var t = url.split(':')[1].split('/');
    var projectNamespace = t[0];
    var projectName = t[1].split('.')[0];
    debug('config', config);
    var workingDir = config.deploy.tmpPagesDir || config.deploy.publicPagesDir;
    var repoPath = path.resolve(workingDir, projectNamespace, projectName);
    debug('repoPath', repoPath);
    debug('url', url);

    // Check if repo already exists
    fs.exists(repoPath, function (exists) {
        var promise = null;
        if (exists) {
            promise = NodeGit.Repository.open(repoPath);
        } else {
            // Clone if not already exists
            promise = NodeGit.Clone(url, repoPath, _.cloneDeep(cloneOptions));
        }
        promise.catch(function (error) {
            console.error(error);
        }).then(function (repo) {
            debug('repo path', repo.path());
            debug('fetch all', repo, cloneOptions);
            return repo.fetchAll(cloneOptions.fetchOpts)
                // Now that we're finished fetching, go ahead and merge our local branch
                // with the new one
                .catch(function (error) {
                    console.error(error);
                })
                .then(function (fetches) {
                    debug('fetches', fetches);
                    return repo.mergeBranches(config.deploy.deployBranch, "origin/" + config.deploy.deployBranch);
                })
                .catch(function (error) {
                    console.error(error);
                })
                .then(function (merges) {
                    debug('merges', merges);
                    debug('afterCommit', afterCommit);
                    debug('repo', repo);
                    return repo.getCommit(afterCommit);
                })
                .catch(function (error) {
                    console.error(error);
                })
                .then(function (commit) {
                    debug('commit', commit);

                    debug('Move from working directory to page directory');
                    // Move from workingDir to pages dir
                    var finalRepoPath = path.resolve(config.deploy.publicPagesDir, projectNamespace, projectName);
                    var configPath = path.resolve(finalRepoPath, '_config.yml');

                    var engine = "jekyll";

                    if (fs.existsSync(configPath))
                    {
                        var cfg = yaml.load("configPath");
                        engine = cfg.engine;
                    } else {
                        configPath = path.resolve('./config/defaults.yml');
                    }

                    // Delete workingDir
                    rmdir(finalRepoPath, function () {

                        if (engine == "jekyll") {
                            // jekyll build --safe --source .tmp/Glavin001/gitlab-pages-example/ --destination pages/Glavin001/gitlab-pages-example
                            var cmd = "jekyll build --safe --source \"" + repoPath + "\" --destination \"" + finalRepoPath + "\" --config \"" + configPath + "\"";
                            exec(cmd, function (error, stdout, stderr) {
                                debug(error, stdout, stderr);
                                // output is in stdout
                                debug('Done deploying ' + projectNamespace + '/' + projectName);
                            });
                        } else if (engine == "raw") {
                            ncp(repoPath, finalRepoPath, function (err) {
                                if (err) {
                                    return console.error("failed to copy repository - " + err);
                                }
                                debug('Done deploying ' + projectNamespace + '/' + projectName);
                            });
                        } else {
                            console.error("ERROR: invalid deploy method: " + engine);
                        }
                    });

                });
        });
    });

    res.end();
});

module.exports = router;
