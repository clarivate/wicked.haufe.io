'use strict';

const express = require('express');
const router = express.Router();
const { debug, info, warn, error } = require('portal-env').Logger('kickstarter:auth');

const { getAzureLoginUrl } = require('./utils.js')


function conditionalEnsureAuth(req, res, next) {
    const openPaths = ['/', '/callback', '/logout'];

    if (openPaths.includes(req.path)) {
        return next();
    }

    if (req.session && req.session.user) {
        return next();
    }

    return res.redirect(getAzureLoginUrl());
}

module.exports = conditionalEnsureAuth;


module.exports = router;
