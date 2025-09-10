const express = require('express');
const router = express.Router();

router.post('/change', (req, res) => {
    console.log('Environment change request received:', req.body);
    const { env } = req.body;
    if (!env) {
        return res.status(400).json({ error: 'env is required.' });
    }
    let basePath = process.env.DEFAULT_BASE_PATH
    basePath = `${basePath}${env}`;
    const configPath = `${basePath}/static/`;
    req.session.env = env;
    req.session.base_path = basePath;
    req.session.config_path = configPath;
    res.json({ success: true, env, basePath, configPath });
});

module.exports = router;
