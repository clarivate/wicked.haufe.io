'use strict';

const express = require('express');
const router = express.Router();
const utils = require('./utils');
const { debug, info, warn, error } = require('portal-env').Logger('kickstarter:index');
const jwt = require('jsonwebtoken');

/* GET home page. */
router.get('/', function (req, res, next) {
    if (!req.session.user) {
        return res.redirect(utils.getAzureLoginUrl());
    }

    const kickstarter = utils.loadKickstarter(req.app);
    res.render('index', {
        configPath: req.app.get('config_path'),
        kickstarter: kickstarter
    });
});

router.get('/callback', function (req, res) {

    const idToken = req.query.code;
    if (!idToken) return res.status(401).send('Missing token');

    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded) return res.status(401).send('Invalid token');

    req.session.user = {
        name: decoded.payload.name,
        email: decoded.payload.preferred_username
    };
    const kickstarter = utils.loadKickstarter(req.app);
    res.render('index', {
        configPath: req.app.get('config_path'),
        kickstarter: kickstarter
    });
});


router.post('/', function (req, res, next) {
    const redirect = req.body.redirect;

    // Do things with the POST body.

    res.redirect(redirect);
});

router.get('/plugindocs', function (req, res) {
    const plugin_doc = JSON.parse(JSON.stringify(utils.getPluginList()))
    for(let elem of plugin_doc.data) {
      elem.config = {name : elem.name,config:elem.config}
    }
    res.render('help',
        {
            p_data: plugin_doc.data
        });
})

module.exports = router;
