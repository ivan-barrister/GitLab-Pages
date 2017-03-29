var express = require('express');
var router = express.Router();
var config = require('../config');
var path = require("path");
var fs = require('fs');
var _ = require('lodash');
var exec = require('child_process').exec;
var debug = require('debug')('routes:syshooks');

/* POST  */
router.post('/hook.json', function(req, res, next) {
    var payload = req.body;
    var evName = payload.event_name;

    var events = [];

    var onUserCreate = function(req, res, next) {
    };

    var onUserRemove = function(req, res, next) {
    };

    var onUserAdd = function(req, res, next) {
    };

    var onUserDel = function(req, res, next) {
    };

    events['user_create'] = onUserCreate;
    events['user_add_to_team'] = onUserAdd;
    events['user_remove_from_team'] = onUserDel;
    events['user_destroy'] = onUserRemove;

    if (events.has(evName))
	events[evName](req,res,next);
    else {
        var err = new Error('Invalid hook');
	err.status = 500;
        next(err);
    }

    res.end();
});

module.exports = router;
