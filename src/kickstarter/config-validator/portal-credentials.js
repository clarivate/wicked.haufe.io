
var ssm = require('./ssm_client.js')
const options = require('./config/config.json')
const API_URL ={
    'STABLE' : 'https://api.dev-stable.clarivate.com/wicked/v1',
    'SNAPSHOT' : 'https://api.dev-snapshot.clarivate.com/wicked/v1',
    'PROD' : 'https://api.clarivate.com/wicked/v1',
    'TEST' : 'https://api.test-perf.clarivate.com/wicked/v1'
}

async function STABLE(){
    console.log('STABLE function entered');
    try {
        if(options.USE_SSM){
            const creds = {
                url:'https://api.dev-stable.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id:  await ssm.getSecret('STABLE_CLIENT_ID'),
                client_secret: await ssm.getSecret('STABLE_CLIENT_SECRET'),
                username: await ssm.getSecret('STABLE_USERNAME'),
                password: await ssm.getSecret('STABLE_PASSWORD')
            };
            console.log('[STABLE] Credentials from SSM');
            return creds;
        }else{
            const creds = {
                url:'https://api.dev-stable.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id:  process.env.STABLE_CLIENT_ID || 'dev-stable-client-id',
                client_secret: process.env.STABLE_CLIENT_SECRET || 'dev-stable-secret',
                username: process.env.STABLE_USERNAME || 'api.admin@clarivate.com',
                password: process.env.STABLE_PASSWORD || 'DevAdmin@stable1'
            };
            console.log('[STABLE] Credentials (manual/env)');
            return creds;
        }
    } catch (err) {
        console.error('Error in STABLE:', err);
        throw err;
    }
}

// async function SNAPSHOT(){
//     if(options.USE_SSM){
//    return {
//     url:'https://api.dev-snapshot.clarivate.com/auth/clarivate/api/portal-api/token',
//     client_id:  await ssm.getSecret('SNAPSHOT_CLIENT_ID'),
//     client_secret: await ssm.getSecret('SNAPSHOT_CLIENT_SECRET'),
//     username: await ssm.getSecret('SNAPSHOT_USERNAME'),
//     password: await ssm.getSecret('SNAPSHOT_PASSWORD')
//    };
//   }else{
//     return {
//         url:'https://api.dev-snapshot.clarivate.com/auth/clarivate/api/portal-api/token',
//         client_id: process.env.SNAPSHOT_CLIENT_ID,
//         client_secret: process.env.SNAPSHOT_CLIENT_SECRET,
//         username: process.env.SNAPSHOT_USERNAME,
//         password: process.env.SNAPSHOT_PASSWORD
//        };
//   }
// }
async function SNAPSHOT(){
    console.log('SNAPSHOT function entered');
    try {
        if(options.USE_SSM){
            const creds = {
                url:'https://api.dev-snapshot.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id:  await ssm.getSecret('SNAPSHOT_CLIENT_ID'),
                client_secret: await ssm.getSecret('SNAPSHOT_CLIENT_SECRET'),
                username: await ssm.getSecret('SNAPSHOT_USERNAME'),
                password: await ssm.getSecret('SNAPSHOT_PASSWORD')
            };
            console.log('[SNAPSHOT] Credentials from SSM:', {
                ...creds,
                client_secret: creds.client_secret ? creds.client_secret.substring(0, 6) + '...' : undefined,
                password: creds.password ? '***' : undefined
            });
            return creds;
        }else{
            const creds = {
                url:'https://api.dev-snapshot.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id: '36a81d97a4f7f7b4a125269ce65b7ace58d1395a',
                client_secret: 'ad2cf38e8f76775c55a2b9e385a53d349f643f40',
                username: 'api.admin@clarivate.com',
                password: 'DevAdmin@snapshot1'
            };
            console.log('[SNAPSHOT] Credentials (manual/env):', {
                ...creds,
                client_secret: creds.client_secret ? creds.client_secret.substring(0, 6) + '...' : undefined,
                password: creds.password ? '***' : undefined
            });
            return creds;
        }
    } catch (err) {
        console.error('Error in SNAPSHOT:', err);
        throw err;
    }
}

async function PROD(){
    console.log('PROD function entered');
    try {
        if(options.USE_SSM){
            const creds = {
                url:'https://api.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id:  await ssm.getSecret('PROD_CLIENT_ID'),
                client_secret: await ssm.getSecret('PROD_CLIENT_SECRET'),
                username: await ssm.getSecret("PROD_USERNAME"),
                password: await ssm.getSecret('PROD_PASSWORD')
            };
            console.log('[PROD] Credentials from SSM');
            return creds;
        }else{
            const creds = {
                url:'https://api.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id: process.env.PROD_CLIENT_ID || 'prod-client-id',
                client_secret: process.env.PROD_CLIENT_SECRET || 'prod-secret',
                username: process.env.PROD_USERNAME || 'api.admin@clarivate.com',
                password: process.env.PROD_PASSWORD || 'ProdAdmin@1'
            };
            console.log('[PROD] Credentials (manual/env)');
            return creds;
        }
    } catch (err) {
        console.error('Error in PROD:', err);
        throw err;
    }
}

async function TEST(){
    console.log('TEST function entered');
    try {
        if(options.USE_SSM){
            const creds = {
                url:'https://api.test-perf.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id: await ssm.getSecret('TEST_CLIENT_ID'),
                client_secret: await ssm.getSecret('TEST_CLIENT_SECRET'),
                username: await ssm.getSecret("TEST_USERNAME"),
                password: await ssm.getSecret('TEST_PASSWORD')
            };
            console.log('[TEST] Credentials from SSM');
            return creds;
        }else{
            const creds = {
                url:'https://api.test-perf.clarivate.com/auth/clarivate/api/portal-api/token',
                client_id: process.env.TEST_CLIENT_ID || 'test-client-id',
                client_secret: process.env.TEST_CLIENT_SECRET || 'test-secret',
                username: process.env.TEST_USERNAME || 'api.admin@clarivate.com',
                password: process.env.TEST_PASSWORD || 'TestAdmin@1'
            };
            console.log('[TEST] Credentials (manual/env)');
            return creds;
        }
    } catch (err) {
        console.error('Error in TEST:', err);
        throw err;
    }
}

exports.PROD = PROD;
exports.SNAPSHOT = SNAPSHOT;
exports.STABLE = STABLE;
exports.TEST = TEST;
exports.API_URL =API_URL;
