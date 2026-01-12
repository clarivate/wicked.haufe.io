var AWS = require('aws-sdk');
AWS.config.update({region: 'us-west-2'});
var ssm = new AWS.SSM();


const SECRETS_MAPPING ={
    "STABLE_CLIENT_SECRET":"/apigateway/stable/client_secret",
    "STABLE_PASSWORD":"/apigateway/stable/password",
    "STABLE_USERNAME":"/apigateway/stable/username",
    "STABLE_CLIENT_ID":"/apigateway/stable/client_id",
    "SNAPSHOT_CLIENT_ID":"/apigateway/snapshot/client_id",
    "SNAPSHOT_CLIENT_SECRET":"/apigateway/snapshot/client_secret",
    "SNAPSHOT_USERNAME":"/apigateway/snapshot/username",
    "SNAPSHOT_PASSWORD":"/apigateway/snapshot/password",
    "PROD_CLIENT_ID":"/apigateway/prod/client_id",
    "PROD_CLIENT_SECRET":"/apigateway/prod/client_secret",
    "PROD_USERNAME":"/apigateway/prod/username",
    "PROD_PASSWORD":"/apigateway/prod/password",
    "TEST_CLIENT_ID":"/apigateway/test/client_id",
    "TEST_CLIENT_SECRET":"/apigateway/test/client_secret",
    "TEST_USERNAME":"/apigateway/test/username",
    "TEST_PASSWORD":"/apigateway/test/password",
    "SNAPSHOT_KONG_KEY":"/1p-api/snapshot/kong/apikey",
    "STABLE_KONG_KEY":"/1p-api/stable/kong/apikey",
    "PROD_KONG_KEY":"/1p-api/prod/kong/apikey",
    "TEST_KONG_KEY":"/1p-api/test-perf/kong/apikey",
    "BITBUCKET_TOKEN" : "/apigateway/bitbucket_token"
}


async function getSecret(parameter) {
    var parameterPromise =  ssm.getParameter({ Name:SECRETS_MAPPING[parameter],WithDecryption: true}).promise();
    return parameterPromise.then(function(data, err) {
        if (err) console.log(err, err.stack);
        else return(data.Parameter.Value);
      });
}
exports.getSecret = getSecret;

