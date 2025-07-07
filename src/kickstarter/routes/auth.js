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
    if (openPaths.some(openPath => {
        const regex = new RegExp(`([/?])${openPath.replace(/^\//, '')}([/?]|$)`);
        return regex.test(req.path);
    })) {
        return next();
    }

    if (req.session && req.session.user) {
        return next();
    }

    return res.render('login');
}

module.exports = conditionalEnsureAuth;
