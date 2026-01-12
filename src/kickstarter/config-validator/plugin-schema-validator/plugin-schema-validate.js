const axios = require("axios");
// var ssm = require('../ssm_client');
// Support ESM-only export in axios-retry v4+
const axiosRetryModule = require('axios-retry');
const axiosRetry = axiosRetryModule.default || axiosRetryModule;
const helper = require('../helper');

axiosRetry(axios, { retries: 3 });

const KongURL = {
    "dev-stable":{
        "url":"https://api-int.dev-stable.clarivate.com/admin/api",
        "key":"STABLE_KONG_KEY"
    },
    "dev-snapshot":{
        "url":"https://api-int.dev-snapshot.clarivate.com/admin/api",
        "key":"SNAPSHOT_KONG_KEY"
    },
    "prod-prod1":{
        "url":"https://api-int.clarivate.com/admin/api",
        "key":"PROD_KONG_KEY"
    },
    "test-perf":{
        "url":"https://api-int.test-perf.clarivate.com/admin/api",
        "key":"TEST_KONG_KEY"
    }
  }

async function validate(pluginConfig, env, errors, file_dir){
    try{
        // using only snapshot for schema validation
        let url = KongURL['dev-snapshot'].url;
        // let apiKey = await ssm.getSecret(KongURL['dev-snapshot'].key); 
        let apiKey='6ea6b08d42055ad74292309023c1473e09bcb4c8'
        // uncomment below lines to use per env schema validation
        // url = KongURL['dev-snapshot'].url;
        // apiKey = await ssm.getSecret(KongURL['dev-snapshot'].key); 

        const results = await Promise.all(pluginConfig.map(async(config)=>{
            try {
                if (config.name === 'jwt') {
                    const { token_verify } = config.config;
                    if (token_verify) {
                        //novalidate is validation flag
                        //rsa_public_key is the public key  
                        //jwt_algorithm is the algorithm used to sign the JWT
                        const { rsa_public_key, jwt_algorithm} = token_verify;
                   
                        await verifyJWTParams(rsa_public_key, jwt_algorithm, file_dir, errors);
                        
                    }
                }
                let res = await axios.post(url+'/schemas/plugins/validate',config,{headers:{'X-ApiKey':apiKey}});
            // console.log(`Plugin Validation : ${config.name} : Response ${res.status}`)
            }catch(err){
                if(err.response){
                    console.log(`Plugin Validation : ${config.name} : ${file_dir} : Response ${err.response.status} : ${JSON.stringify(err.response.data)}`)
                    errors.push(`Plugin Validation : ${config.name} : ${file_dir} : Response ${err.response.status} : ${JSON.stringify(err.response.data)}`)
                }else{
                    errors.push(err)
                }   
            }
        }))
   
    }catch(err){
        console.log(err);
        errors.push(err)
    }
   return errors;
}

async function verifyJWTParams(rsaPublicKey, jwtAlgorithm, file_dir,errors) {
        try {
            const defaultEnvVariables = await helper.getDefaultEnvVariables(file_dir);
            if (rsaPublicKey && rsaPublicKey.startsWith('$') && Object.keys(defaultEnvVariables).length > 0) {
                const refEnvVariable = rsaPublicKey.substring(1);
                if (!defaultEnvVariables.hasOwnProperty(refEnvVariable)) {
                    errors.push(`rsa public Key value ${refEnvVariable} is invalid in file ${file_dir},Please fix it`);
                }
            }

            if (jwtAlgorithm && jwtAlgorithm.startsWith('$') && Object.keys(defaultEnvVariables).length > 0) {
                const refEnvVariable = jwtAlgorithm.substring(1);
                if (!defaultEnvVariables.hasOwnProperty(refEnvVariable)) {
                    errors.push(`jwt algorithm value ${refEnvVariable} is invalid in file ${file_dir},Please fix it`);
                }
            }
           
        } catch (err) {
            const errorMessage = `Error in verifyJWTParams function: ${err.message}`;
            console.error(errorMessage, err);
            errors.push(errorMessage);
        }
}
exports.validate = validate;