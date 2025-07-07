'use strict';

const express = require('express');
const router = express.Router();
const { debug, info, warn, error } = require('portal-env').Logger('kickstarter:auth');



function conditionalEnsureAuth(req, res, next) {
    const openPaths = ['/callback', '/logout', '/adlogin'];
    const assetExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.map'];
    if (assetExtensions.some(ext => req.path.endsWith(ext))) {
        return next();
    }
    info('Checking authentication for path:', req.path);
    info('Open paths:', openPaths);
    info('User session:', req.session && req.session.user);
    if (openPaths.includes(req.path)) {
        return next();
    }

    if (req.session && req.session.user) {
        return next();
    }

    return res.render('login');
}

module.exports = conditionalEnsureAuth;
