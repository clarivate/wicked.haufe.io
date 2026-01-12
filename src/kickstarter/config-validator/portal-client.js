const axios = require("axios");
const oauth = require("axios-oauth-client");
const Credentials = require("./portal-credentials");
const OAUTH_GRANT_TYPE = "password"; // Resoure Owner Password Grant
const OAUTH_GRANT_TYPE_CLIENT = "client_credentials"; // Client Credentials Grant
const SCOPES = ["read_apis", "read_subscriptions", "read_plans"];
const CLIENT_SCOPES = "read_apis read_subscriptions read_plans";

//env names
const STABLE = "dev-stable";
const SNAPSHOT = "dev-snapshot";
// const TEST = "test-perf";
// const PROD = "prod-prod1";

const axiosInstance = {};
axiosInstance[STABLE] = axios.create({ baseURL: Credentials.API_URL.STABLE });
axiosInstance[SNAPSHOT] = axios.create({ baseURL: Credentials.API_URL.SNAPSHOT });
// axiosInstance[PROD] = axios.create({ baseURL: Credentials.API_URL.PROD });
// axiosInstance[TEST] = axios.create({ baseURL: Credentials.API_URL.TEST });

async function init() {
  tokens =[];
  console.log("Initializing Portal Client...");
  try {
    let credentials = await Credentials.STABLE()
    console.log("Developer Portal credentials :stable");
    tokens.push(await setInterceptor(STABLE, credentials));
  } catch (e) {
    console.error(`wicked / 1poauth down : ${STABLE}`);
  }

  try {
    let credentials = await Credentials.SNAPSHOT();
    console.log("Developer Portal credentials :snapshot");
   tokens.push(await setInterceptor(SNAPSHOT, credentials));
  } catch (e) {
    console.error(`wicked / 1poauth down  nag: ${SNAPSHOT}`);
  }

  // try {
  //   let credentials = await Credentials.PROD();
  //   console.log("Developer Portal credentials :prod");
  //   tokens.push(await setInterceptor(PROD, credentials));
  // } catch (e) {
  //   console.error(`wicked / 1poauth down : ${PROD}`);
  // }

//   try {
//     let credentials = await Credentials.TEST()
//     console.log("Developer Portal credentials :test");
//     tokens.push(await setInterceptor(TEST, credentials));
//   } catch (e) {
//     console.error(`wicked / 1poauth down : ${TEST}`);
//   }
  return tokens;
}

async function getToken(conf) {
  console.log('[getToken] Requesting token with axios (client_credentials):', {
    url: conf.url,
    grant_type: 'client_credentials',
    client_id: conf.client_id,
    client_secret: conf.client_secret ? conf.client_secret.substring(0, 6) + '...' : undefined,
  });
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', conf.client_id);
    params.append('client_secret', conf.client_secret);
    // If you need scope, uncomment the next line:
    // params.append('scope', CLIENT_SCOPES);
    const response = await axios.post(conf.url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log('[getToken] Token response:', response.data);
    return response.data.access_token;
  } catch (err) {
    if (err.response) {
      console.error('[getToken] Error response:', err.response.status, err.response.data);
    } else {
      console.error('[getToken] Error:', err.message);
    }
    throw err;
  }
}





function setToken(env, token) {
  axiosInstance[env].interceptors.request.use((config) => {
    config.headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    };
    return config;
  });
}

async function setInterceptor(env, conf) {
  const token = await getToken(conf);
  setToken(env, token);
  return token;
}

function getAPIS(env) {
  console.log('[DEBUG] getAPIS: axiosInstance[env] =', axiosInstance[env], 'env =', env);
  return axiosInstance[env]
    .get("/apis")
    .then(function (response) {
      return response.data.apis;
    })
    .catch(function (error) {
      console.log("in Error" + error.message);
      return error.message;
    });
}

function getSubscription(apiId, env) {
  console.log('[DEBUG] getSubscription: axiosInstance[env] =', axiosInstance[env], 'env =', env);
  return axiosInstance[env]
    .get(`/apis/${apiId}/subscriptions`)
    .then(function (response) {
      return response.data.items;
    })
    .catch(function (error) {
      return error.message;
    });
}

function getPlans(env){
  console.log('[DEBUG] getPlans: axiosInstance[env] =', axiosInstance[env], 'env =', env);
  return axiosInstance[env]
    .get('/plans')
    .then(function (response) {
      return response.data.plans;
    })
    .catch(function (error) {
      console.log(error.message);
      return error.message;
    });
}
exports.init = init;
exports.getAPIS = getAPIS;
exports.getSubscription = getSubscription;
exports.getPlans = getPlans;
