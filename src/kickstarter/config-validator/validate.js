const path = require(`path`);
const fs = require(`fs`);
const { isArray } = require(`util`);

var helper = require("./helper");
var client = require("./portal-client");
var pluginSchemaValidator = require('./plugin-schema-validator/plugin-schema-validate');
const options = require("./config/config.json");

let api_map = new Map()
const NULL = "null"
const DELIMITER = '##'

const delimter_indexes = {
  headers:5,
  hosts: 3,
  methods: 4,
  protocols: 2,
  paths: 1,
  name: 0
}


// auto merge changes start
var ssm = require('./ssm_client.js')
const axios = require(`axios`)
const apiSchema = require('./apiConfigRules.json');
const apiMeta = require('./apiMeta.json')

// const { Octokit } = require("@octokit/rest");
// const githubToken = process.env.READ_KEY;
// const octokit = new Octokit({ auth: githubToken });

const actionType = {
  "MODIFY" : false,
  "ADD"    : false,
  "DELETE" : false,
  "COPY"   : false
}

var changedPrApiFiles = [];
var fileNames = []
var envList = []
const VALIDATOR = 'config-validator'
// auto merge changes end


//stores all the errors
let errors = [];
const reservedPaths=['/auth/*','/auth']
// const excludedAPIs = ['platform-microui-login-api', 'rics-ontology','rics-roles-ui','rics-triage-ui','rics-ui'];

//a generic function to find whether obj2 contains the generic structure and with correct variable type which is present in obj1
function validateSchema(json,rules) {
  /*for (key in obj1) {
    if (!(key in obj2)) {
      throw `missing parameter : ${key}`;
    } else {
      obj1_type = typeof obj1[key];
      obj2_type = typeof obj2[key];
      if (obj1_type != obj2_type || isArray(obj1[key]) != isArray(obj2[key])) {
        throw `type mismatch for parameter : ${key}`;
      }
    }
    if (obj1.hasOwnProperty(key)) {
      var val1 = obj1[key];
      var val2 = obj2[key];
      validateSchema(val1, val2);
    }
  }*/

  // auto merge changes start
  const errors = [];
  let apiName = json.api ? json.api.name : "";
    function validateField(field, value, rule) {
      if (rule.mandatory && (value === undefined || value === null)) {
          errors.push(`${apiName}----> ${field} is mandatory but missing`);
          return;
      }
      if (value === undefined || value === null) {
        return;
      }
      switch (rule.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(`${apiName}----> ${field} must be a string`);
            }
            break;
        case 'number':
            if (typeof value !== 'number') {
                errors.push(`${apiName}----> ${field} must be a number`);
            }
            break;
        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(`${apiName}----> ${field} must be a boolean`);
            }
            break;
        case 'array':
            if (!Array.isArray(value)) {
                errors.push(`${apiName}----> ${field} must be an array`);
            } else {
                if (rule.elements) {
                    value.forEach((element, index) => {
                        validateField(`${apiName}----> ${field}[${index}]`, element, rule.elements);
                    });
                }
            }
            break;
        case 'object':
            if (typeof value !== 'object' || Array.isArray(value)) {
                errors.push(`${apiName}----> ${field} must be an object`);
            }
            break;
        default:
            break;
          }
  
          if (rule.dependsOn) {
            if (rule.dependsOn === 'enable_routes' && json['api']['enable_routes'] && (value === null || value === "")) { 
              errors.push(`${apiName}----> ${field} depends on ${rule.dependsOn} but it is missing`);
            }
          }

          if (field === 'protocols' && Array.isArray(value) && value.length === 0) {
            errors.push(`${apiName}----> ${field} should not be an empty array.`);
        }
        
      }
       
      function traverse(obj, rules, prefix = '') {
        for (const key in rules) {
            const field = prefix ? `${prefix}[${key}]` : key;
            const rule = rules[key];
            if (rule.type === 'object') {
                if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    traverse(obj[key], rule.fields, field);
                } else {
                    validateField(field, obj[key], rule);
                }
            } else if (rule.type === 'array' && obj[key]) {
                obj[key].forEach((element, index) => {
                    let rules1 = rule['elements']
                    if(rules1 && 'fields' in rules1) {
                       rules1 =  rule['elements']['fields']
                    }
                    traverse(element, rules1, `${field}[${index}]`);
                }) }
            else {
                validateField(field, obj[key], rule);
            }
        }
    }
  
    traverse(json, rules);
    return errors;
  //auto merge changes end
}

//Function to open JSON files. creates an error in case of invalid JSON structure
function openFile(path) {
  try {
    file = require(path);
    return file;
  } catch (e) {
    errors.push(`Invalid JSON structure : ${path}`);
  }
}

// function to get persistent data that are used in multiple places
function populateData(dirName) {
  console.log('populating data for all the apis')
  console.log('the dirname is......'+dirName)
   apiListUnfiltered= [];
  const groups_config = openFile(path.join(dirName, `groups`, `groups.json`));
  const plans_config = openFile(path.join(dirName, `plans`, `plans.json`));
  const api_config = openFile(path.join(dirName, `apis`, `apis.json`));
  const auth_config = openFile(path.join(dirName, `auth-servers`, `default.json`));
  let groups = {},
    apis = {},
    plans = {},
    auth_methods = {};
  const auth_types = {
    "key-auth": "key-auth",
    oauth2: "oauth2",
    none: "none",
  };
  for (grp of groups_config.groups) {
    groups[grp.id] = grp;
  }
  for (api of api_config.apis) {
    apis[api.id] = api;
    apiListUnfiltered.push(api.id);
  }
  for (pln of plans_config.plans) {
    plans[pln.id] = pln;
  }
  for (ath of auth_config.authMethods) {
    auth_methods[ath.name] = ath.name;
  }
  return [groups, apis, plans, auth_types, auth_methods,apiListUnfiltered];
}

//function to validate api configuration JSON.

/**
 * Validate API configs, supporting in-memory (unsaved) API config for duplicate path and related checks.
 * @param {string} dirName - Directory name containing APIs
 * @param {object} all_apis - All APIs from api.json
 * @param {object} [updatedApiConfig] - Optional in-memory API config to use instead of disk version
 */
function validateApiConfigs(dirName, all_apis, updatedApiConfig) {
  console.log('updatedApiConfig in validateApiConfigs: ', updatedApiConfig);
  let apis_in_directory = [];
  const api_dir = path.join(dirName, `apis`);
  files = fs.readdirSync(api_dir);
  files.forEach(function (file) {
    file_dir = path.join(api_dir, file);
    //here we shud not check only for changed file, Have to iterate thru all for duplicate paths
    if (fs.statSync(file_dir).isDirectory()) {
      apis_in_directory.push(file);
      let api;
      // Use in-memory config if provided and matches this API
      if (
        updatedApiConfig &&
        updatedApiConfig.api &&
        updatedApiConfig.api.name === file
      ) {
        api = updatedApiConfig;
        console.log(`Using in-memory config for API: ${file}`);
        console.log(JSON.stringify(api, null, 2));
      } else {
        api = openFile(path.join(file_dir, `config.json`));
      }
      // Skip if api is undefined (openFile already added error to errors array)
      // if (!api || !api.api) {
      //   return;
      // }
      if (!(file == api.api.name)) {
        errors.push(`Inconsistent API Id ${file} and ${api.api.name} [${dirName}]`);
      }
      try {
        if (fileNames.includes(file)) {
          console.log(`checking file for schema validation ---->${file}`);
          const validationErrors = validateSchema(api, apiSchema);
          if (validationErrors.length > 0) {
            errors.push(validationErrors);
          }
        }
      } catch (e) {
        errors.push(`${e} in api : ${file}, path : ${path.join(file_dir, `config.json`)}`);
      }
      //adding api data as map key
      addApiConfigData(api);
    }
  });
  for (api of Object.keys(all_apis).filter((api) => !apis_in_directory.includes(api))) {
    errors.push(`api : ${api}, present in : api.json, absent in : directory, path : ${api_dir}`);
  }
  for (api of apis_in_directory.filter((api) => !Object.keys(all_apis).includes(api))) {
    errors.push(`api : ${api}, present in : directory, absent in : api.json, path : ${api_dir}`);
  }
}

//recursively validates all the json files for correctness of their structure
function validateAllJsonStructure(dirName) {
  files = fs.readdirSync(dirName);
  files.forEach(function (file) {
    if (fs.statSync(path.join(dirName, file)).isDirectory() && (fileNames.includes(file)|| file === 'apis')) {
      validateAllJsonStructure(path.join(dirName, file));
    } else {
      if (file.endsWith(`.json`)) {
        file = path.join(dirName, file);
        openFile(file);
      }
    }
  });
}

//validates the api.json file schema which contains the metadata for the APIs
function validateApiMetadata(dirName, all_groups, all_plans, all_auth_type, all_auth_methods) {
  const api_md_file = openFile(path.join(dirName, `apis`, `apis.json`));
  const generic_api_md = openFile(path.join(__dirname, `generic-api-metadata.json`));
  for (api of api_md_file.apis) {
    try {
      validateSchema(generic_api_md, api);
    } catch (e) {
      errors.push(`${e} in api : ${api.id}, path : ${api_md_file}`);
    }

  // --check requiredGroup for JWT  based APIs
  if (fileNames.includes(api.id)) {
    try {
      const configPath = path.join(dirName, 'apis', api.id, 'config.json');
      if (fs.existsSync(configPath)) {
        const apiConfig = openFile(configPath);
        if (
          apiConfig.plugins &&
          Array.isArray(apiConfig.plugins) &&
          apiConfig.plugins.some(plugin => plugin.name === 'jwt')
        ) {
          if (!api.requiredGroup || api.requiredGroup.trim() === "") {
            errors.push(
              `API '${api.id}' uses JWT  but has no requiredGroup set. Please set requiredGroup to 'internal' or another group.`
            );
          }
        }
      }
    } catch (e) {
      errors.push(`Error reading config.json for API '${api.id}': ${e}`);
    }
  }

    if (api.hasOwnProperty(`plans`)) {
      for (plan of api.plans) {
        if (!all_plans[plan]) {
          errors.push(`Invalid plan : ${plan} in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
        }
      }
    }
    if (api.hasOwnProperty(`authMethods`)) {
      for (ath_mthd of api.authMethods) {
        ath_mthd = ath_mthd.split(`:`);
        ath_mthd = ath_mthd[ath_mthd.length - 1];
        if (!all_auth_methods[ath_mthd]) {
          errors.push(`Invalid auth method : ${ath_mthd} in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
        }
      }
    }

    /*if (fileNames.includes(api.id)) {
      if (api.hasOwnProperty(`requiredGroup`)) {
        if (api.requiredGroup !== `` && !all_groups[api.requiredGroup]) {
          errors.push(`Invalid group : ${api.requiredGroup} in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
        }
        if ((!api.requiredGroup || api.requiredGroup.length === 0) && !api.hasOwnProperty('partner')) {
          errors.push(`API group name is not provided , Invalid Configuration : ${api.requiredGroup} in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
        }
      }
      if (api.hasOwnProperty(`businessSegment`) && api.businessSegment === "") {
        errors.push(`Empty business segment in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
      } else if (!api.hasOwnProperty(`businessSegment`)) {
        errors.push(`Missing business segment in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
      }

      if (api.hasOwnProperty(`owners`) && (!Array.isArray(api.owners) || api.owners.length === 0)) {
        errors.push(`Invalid owner in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
      } else if (!api.hasOwnProperty(`owners`)) {
        errors.push(`Missing owner in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
      }

      if (api.hasOwnProperty(`productGroup`) && api.productGroup === "") {
        errors.push(`Empty product group in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
      } else if (!api.hasOwnProperty(`productGroup`)) {
        errors.push(`Missing product group in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
      }
    }*/
    if (api.hasOwnProperty(`auth`)) {
      if (api.auth !== `` && !all_auth_type[api.auth]) {
        errors.push(`Invalid auth type : ${api.auth} in api : ${api.id}, path: ${path.join(dirName, `apis`, `apis.json`)}`);
      }
    }
  }
}


// Validate a single API's metadata using in-memory objects (not from disk)
function validateSingleApiMetadata(apiJson, configJson, all_groups, all_plans, all_auth_type, all_auth_methods) {
  const errors = [];
  try {
    const genericApiMetadata = openFile(path.join(__dirname, `generic-api-metadata.json`));
    validateSchema(genericApiMetadata, apiJson);
  } catch (e) {
    errors.push(`${e} in API: ${apiJson.id}`);
  }

  // Check requiredGroup for JWT-based APIs
  if (
    configJson.plugins &&
    Array.isArray(configJson.plugins) &&
    configJson.plugins.some(plugin => plugin.name === 'jwt')
  ) {
    if (!apiJson.requiredGroup || apiJson.requiredGroup.trim() === "") {
      errors.push(
        `API '${apiJson.id}' uses JWT but has no requiredGroup set. Please set requiredGroup to 'internal' or another group.`
      );
    }
  }

  // Validate plans
  if (apiJson.hasOwnProperty(`plans`)) {
    for (const plan of apiJson.plans) {
      if (!all_plans[plan]) {
        errors.push(`Invalid plan: ${plan} in API: ${apiJson.id}`);
      }
    }
  }

  // Validate authMethods
  if (apiJson.hasOwnProperty(`authMethods`)) {
    for (let authMethod of apiJson.authMethods) {
      authMethod = authMethod.split(`:`).pop();
      if (!all_auth_methods[authMethod]) {
        errors.push(`Invalid auth method: ${authMethod} in API: ${apiJson.id}`);
      }
    }
  }

  // Validate auth type
  if (apiJson.hasOwnProperty(`auth`)) {
    if (apiJson.auth !== `` && !all_auth_type[apiJson.auth]) {
      errors.push(`Invalid auth type: ${apiJson.auth} in API: ${apiJson.id}`);
    }
  }

  return errors;
}



async function CheckSubscriptionsOnApiDelete(active_apis, config_apis, env) {
  // Ensure inputs are arrays
  if (!Array.isArray(active_apis)) active_apis = [];
  if (!Array.isArray(config_apis)) config_apis = [];
  
  const isSameAPI = (a, b) => a.id === b.id;
  const onlyInPortal = (left, right, compareFunction) =>
    left.filter((leftValue) => !right.some((rightValue) => compareFunction(leftValue, rightValue)));
  const onlyInActive = onlyInPortal(active_apis, config_apis, isSameAPI);
  var active_apps = [];
  var affected_apis = [];
  for (var api of onlyInActive) {
    if (api.id != "echo" && api.id != "portal-api") {
      //internal apis , not in config
      if (!api.deprecated) errors.push(`!! ${api.id} is not Deprecated !!`);
      apps = await client.getSubscription(api.id, env);
      if (apps.length > 0) {
        for (app of apps) active_apps.push(app.application);
        affected_apis.push(api.id);
      }
    }
  }
  return [active_apps, affected_apis];
}

async function CheckSubscriptionsOnApiIDChange(active_apis, config_apis, env) {
  // Ensure inputs are arrays
  if (!Array.isArray(active_apis)) active_apis = [];
  if (!Array.isArray(config_apis)) config_apis = [];
  
  changed = [];
  function isSame(a, b) {
    if(a.id === "alert-manager" && b.id === "alert-manager") {
      console.log('inside isSame')
      console.log(a)
      console.log(b)
    }
    if (a.id === b.id && a.name === b.name) return true;
    else if (a.id !== b.id && a.name === b.name) {
      changed.push(b);
      return false;
    }
    return false;
  }
  const onlyInConfig = (left, right, compareFunction) =>
    left.filter((leftValue) => !right.some((rightValue) => compareFunction(leftValue, rightValue)));
  onlyInConfig(config_apis, active_apis, isSame);
  var active_apps = [];
  var affected_apis = [];
  for (var api of changed) {
    if (api.id != "echo" && api.id != "portal-api") {
      //internal apis , not in config
      apps = await client.getSubscription(api.id, env);
      if (apps.length > 0) {
        for (app of apps) active_apps.push(app.application);
        affected_apis.push(api.id);
      }
    }
  }
  return [active_apps, affected_apis];
}

async function CheckChangeInPlans(plansInConfig, apisInPortal, apisInConfig, env) {
  // Ensure inputs are arrays
  if (!Array.isArray(plansInConfig)) plansInConfig = [];
  if (!Array.isArray(apisInPortal)) apisInPortal = [];
  if (!Array.isArray(apisInConfig)) apisInConfig = [];
  
  plansInConfig.sort(helper.comparePlans);
  plansInPortal = await client.getPlans(env);
  // Defensive check: ensure plansInPortal is an array
  if (!Array.isArray(plansInPortal)) {
    console.error('Error: plansInPortal is not an array. Response:', plansInPortal);
    return [{ plan: 'portal_api_error', apis: [], error: `Failed to fetch plans from portal: ${plansInPortal}` }];
  }
  // console.log('the plans in config are----->'+JSON.stringify(plansInConfig));
  plansInPortal = plansInPortal.filter((plan) => plan.id !== "__internal_api_basic" && plan.id !== "__internal_api_unlimited");
  plansInPortal.sort(helper.comparePlans);

  config_plan_api_map = helper.getApiPlanMap(apisInConfig);
  // console.log('the config_plan_api_map is----->'+JSON.stringify(Array.from(config_plan_api_map.entries())));
  portal_plan_api_map = helper.getApiPlanMap(apisInPortal);
  // console.log('the portal_plan_api_map is----->'+JSON.stringify(Array.from(portal_plan_api_map.entries())));

 // console.log('the plans in portal after filtering are----->'+JSON.stringify(plansInPortal));
  // console.log('the plans in config after filtering are----->'+JSON.stringify(plansInConfig));
  // if plan deleted
  if (plansInConfig.length < plansInPortal.length) {
    deletedPlan = [];
    for (plan of plansInPortal) {
      if (!helper.contains(plansInConfig, plan.id)) deletedPlan.push(plan);
    }
    result = [];
    for (plan of deletedPlan) {
      result.push({ plan: plan.id, apis: portal_plan_api_map.get(plan.id) });
    }
    return result;
  }

  // if plan not deleted but checking for changed id
  if (plansInConfig.length == plansInPortal.length) {
    changedPlan = [];
    for (i in plansInConfig) {
      if (plansInConfig[i].id !== plansInPortal[i].id) changedPlan.push(plansInPortal[i]);
    }
    result = [];
    for (plan of changedPlan) {
      result.push({ plan: plan.id, apis: portal_plan_api_map.get(plan.id) });
    }
    return result;
  }
  return;
}

function checkDuplicateService(apis){
  repeated = helper.findDuplicates(apis);
  return repeated;
}

//commenting  out pr based validation

/*async function main(queryPortal) {
    // Extract environment from dirName and set envList for compatibility
    if (dirName) {
      const envFromDir = dirName.split(/[/\\]/).filter(Boolean)[dirName.includes(':') ? 3 : 0];
      if (envFromDir) {
        envList = [envFromDir];
        console.log('envList set from dirName:', envList);
      }
    }
  // Step 1: Get dirName, fileNames (api_id), and kongConfig from process arguments if provided
  // Usage: node validate.js <dirName> <api_id> <kongconfig>
  let dirName = undefined;
  let kongConfig = undefined;
  if (process.argv.length > 2) {
    dirName = process.argv[2];
  }
  if (process.argv.length > 3) {
    fileNames = [process.argv[3]];
  }
  if (process.argv.length > 4) {
    kongConfig = process.argv[4];
  }
  if (dirName) {
    console.log('dirName:', dirName);
  }
  if (fileNames.length > 0) {
    console.log('fileNames:', fileNames);
  }
  if (kongConfig) {
    console.log('kongConfig:', kongConfig);
  }

  async function makeDnsRestCall(dnsUrl) {
    try {
      const response = await axios.get(dnsUrl);
      // Do nothing with the response
    } catch (error) {
      console.error(`Error making DNS REST call to ${dnsUrl}:`, error);
    }
  }

  const dnsUrls = [
      'https://api.dev-snapshot.clarivate.com',
      'https://api.dev-stable.clarivate.com',
      'https://api.test-perf.clarivate.com',
      'https://api.clarivate.com'
  ];

  for (const dnsUrl of dnsUrls) {
      await makeDnsRestCall(dnsUrl);
  }
  try {
  if(queryPortal)await client.init();
  // const repo_path = path.join(__dirname,`wicked-config`) // local dev
  // const repo_path = process.argv[3];
  // console.log(repo_path);
//   try {
//   let prID = process.argv[2];
//   if(prID) {
//     console.log(`${prID} got pull requestId, finding only the changed files`)
//     await getPRChangedFiles(prID)
//   }
// }catch(err) {
//    console.log('error is----'+err)
// }

 
  const envs = [`dev-snapshot`, `dev-stable`, `prod-prod1`, `test-perf`];
  for (env in envs) {
    if(envList.includes(envs[env])) {
    console.log(`- - - - ${envs[env]} - - - -`);
    const dirName = path.join(repo_path, envs[env], `static`);
    console.log('the dirname is......'+dirName)
    console.log("Checking JSON Files ...");
    try {
      validateAllJsonStructure(dirName);
    }
    catch(err) {
      console.log(err)
    }
    const [all_groups, all_apis, all_plans, all_auth_type, all_auth_methods ,listUnfiltered] = populateData(dirName);
    console.log("Matching API Metadata ...");
    validateApiMetadata(dirName, all_groups, all_plans, all_auth_type, all_auth_methods);
    console.log("Matching API Config ...");

    // Checking for duplicate service names
      duplicates = checkDuplicateService(listUnfiltered)
      if(duplicates.length>0)
        {
          errors.push(`${envs[env]} : Duplicate Service name at :`+duplicates.toString())
      }


    validateApiConfigs(dirName, all_apis);

    // Validate Plugin schema against kong
    console.log("Validating Plugin Schema ...");
    try{
    errors = await validatePluginSchema(dirName+'/apis', envs[env], errors)
    }catch(err){
      console.log(err)
    }

  if(queryPortal)
  {
    allActiveAPIS = await client.getAPIS(envs[env]);
    console.log("Checking invalid delete ...");
    // API-1371 Checking if any api with active subscriptions is being deleted.
    try {
      result = await CheckSubscriptionsOnApiDelete(allActiveAPIS, Object.values(all_apis), envs[env]);
      active_apps = result[0];
      affected_apis = result[1];
      if (active_apps.length > 0) {
        errors.push(
          `${envs[env]} : Cannot delete APIs : ${affected_apis.toString()}, with active Subscriptions : ${active_apps.toString()}, `
        );
      }
    } catch (e) {
      errors.push(`Error in getting Subscriptions:${envs[env]}`);
    }

    //API-1372 Checking if any api-id is changed with active subscriptions
    console.log("Checking invalid id change ...");
    try {
      result = await CheckSubscriptionsOnApiIDChange(allActiveAPIS, Object.values(all_apis), envs[env]);
      active_apps = result[0];
      affected_apis = result[1];
      if (active_apps.length > 0) {
        errors.push(
          `${envs[env]} : Cannot change api-id : ${affected_apis.toString()}, with active Subscriptions : ${active_apps.toString()}, `
        );
      }
    } catch (e) {
      errors.push(`Error in getting Subscriptions:${envs[env]}`);
    }

    // API-1373 Check change in plan id with subscriptions
    console.log("Checking plans ...");
    try {
      plansInConfig = helper.getConfigPlans(dirName);
      result = await CheckChangeInPlans(plansInConfig, allActiveAPIS, Object.values(all_apis), envs[env]);
      if (result && result.length > 0)
        for (conflict of result)
          errors.push(`Cannot change/delete plan: ${conflict.plan}, has following subscriptions ${conflict.apis.toString()}`);
    } catch (e) {
      console.log(e);
      errors.push(`Error in getting Plans:${envs[env]}`);
    }
  }

    // API-1374 Some more checks
    console.log("Desc files ..");
    try {
      result = helper.validateAllMarkdownFiles(path.join(dirName, "apis"));
      if (result.length > 0)
        for (res of result) {
          errors.push(`desc.md file missing at ${res}`);
        }
    } catch (e) {
      errors.push(e);
    }
    api_map.clear();
  }
}
  if (errors.length > 0) {
    console.log("\x1b[31mErrors\x1b[0m")
    for(let err of errors){
      console.log("\x1b[31m"+err+"\x1b[0m")
    }
    process.exit(1);
  }
/* disable automerge snapshot
  if (envList.includes('dev-snapshot')) {
      console.log('Snapshot  changes detected, failing the PR');
      process.exit(1);
   } */
 
  /*here all validations are done
  const currentHour = new Date().getUTCHours();
  if (currentHour <= 3 || currentHour > 11) {
    console.log('out of automerge timeslot,failing the build');
    process.exit(1);
  }*/
// } catch(err) {
//   console.log('error occured during validator execution')
//   console.log(err)
//   process.exit(1)
// }
// }*/
/*
 * This method takes the routes,path data of a service
 *  from api config file
 * @param {json} apiData 
 */
const addApiConfigData = (apiData) => {
  var apiName = apiData.api.name
  let apiRoutes = apiData.api.routes
  apiRoutes.forEach(route => {
      let paths = route.paths
      const [hosts, methods, protocols,headers] = extractRouteMetaData(route);
      if (fileNames.includes(apiName) && route.protocols && route.protocols.length == 0) { 
        errors.push(`No protocols defined for ${apiName} API,Please remove it or add protocols`)
      }
      paths.forEach(apiPath  => {
          // if(apiPath =='/' && !excludedAPIs.includes(apiName)) {
          //   throw `basepath detected for other api ${apiName}, please fix it `;
          // }
          if (fileNames.includes(apiName) && reservedPaths.includes(apiPath)) { 
            errors.push(`Reserved path ${apiPath} detected for ${apiName} API,Please remove it`)
          }
          let matched = checkForDuplicateData(apiPath, apiName, hosts, methods, protocols,headers)
          if (!matched) {
              let apiValue = apiName + DELIMITER + apiPath + DELIMITER + protocols + DELIMITER + hosts + DELIMITER + methods + DELIMITER + JSON.stringify(headers)
              let existing_records = api_map.get(apiPath)
              if (existing_records) {
                  existing_records.push(apiValue)
              } else {
                  existing_records = []
                  existing_records.push(apiValue)
              }
              api_map.set(apiPath, existing_records)
          }
      })
  })
}


/**
 * This method compares the api metadata
 *  for checking the duplicates in path,routes etc.
 * @param {string} route_path 
 * @param {string} api_name 
 * @param {array} hosts 
 * @param {array} methods 
 * @param {array} protocols 
 * @param {object} headers
 * @returns true if duplicates found,else false
 */
const checkForDuplicateData = (route_path, api_name, hosts, methods, protocols,headers) => {
  let matched = false
  if (api_map.has(route_path)) {
      let records = api_map.get(route_path)
      records.forEach(record => {
          let existing_data = record.split(DELIMITER)
          let result_flags = getResultJsonModel()
          result_flags.path = 1
          result_flags.hosts = checkSubsetAndEquality(hosts, existing_data[delimter_indexes.hosts]);
          result_flags.protocols = checkSubsetAndEquality(protocols, existing_data[delimter_indexes.protocols]);
          result_flags.methods = checkSubsetAndEquality(methods, existing_data[delimter_indexes.methods]);
          let headers2 = JSON.parse(existing_data[delimter_indexes.headers]);
          result_flags.headers = checkHeadersSubsetAndEquality(headers,headers2);
          matched = Object.values(result_flags).every((item) => {
              return item === 1;
          })

          if (matched) {
              console.log("The duplicate route configuration is found with the apis ")
              console.log("********************************************")
              console.log("API 1 ---->", existing_data[delimter_indexes.name])
              console.log("API 2 ----->", api_name)
              console.log("********************************************")
              errors.push("The API's "+ existing_data[delimter_indexes.name] + " and "+ api_name + " having duplicate path")
              return
          }
      })
  }
  return matched
}

async function validatePluginSchema(dirName, env , errors){
  let pluginsForEnv = [];
  let files = fs.readdirSync(dirName);
  for(let file of files){
    if("apis"=== file || fileNames.includes(file)) {
    file_dir = path.join(dirName, file);
    if (fs.statSync(file_dir).isDirectory()) {
      const api = openFile(path.join(file_dir, `config.json`));
      for(let plugin of api.plugins){
        pluginsForEnv.push(plugin);
      } 
    }
    }
  }

    

    // Call Kong in batch of 500 to avoid exhausting jenkins agent connection limit.
    const batchSize = 500;
    for (let i = 0; i < pluginsForEnv.length; i += batchSize) {
      let batch = pluginsForEnv.slice(i, i + batchSize); 
      errors = await pluginSchemaValidator.validate(batch, env, errors, file_dir);
    }
  return errors
}

async function validatePluginSchemaforapi(dirname, env, errors, config) {
  if (!config || !Array.isArray(config.plugins)) {
    return errors;
  }
  const plugins = config.plugins;
  const api_id = config.api.name;
  console.log(`Validating ${plugins.length} plugins for API: ${api_id}`);
  console.log("list of plugins to be validated", plugins);
  const file_dir = path.join(dirname, 'apis', api_id);
  // Optionally extract env from dirname if needed, but don't overwrite the parameter unless required
  // env = dirname.split(path.sep).slice(-2, -1)[0];

  // Call Kong in batch of 500 to avoid exhausting jenkins agent connection limit.
  const batchSize = 500;
  for (let i = 0; i < plugins.length; i += batchSize) {
    let batch = plugins.slice(i, i + batchSize);
    errors = await pluginSchemaValidator.validate(batch, env, errors, file_dir);
  }
  return errors;
}
/**
 * This is generic function to find the common elements 
 * exists or not between two arrays
 * @param {array} a 
 * @param {array} b 
 * @returns 1 if common elements exists else 0
 */
const checkSubsetAndEquality = (a, b) => {

  a = (a === "null") ? [] : a
  b = (b === "null") ? [] : b.split(",")
  const empty_arrays = a.length === 0 ? ( b.length === 0 ? true :false ) : false

  common_elements = a.some(item => b.includes(item))
  if (common_elements || empty_arrays) {
      return 1
  }
  return 0

}

const checkHeadersSubsetAndEquality = (headers1, headers2) => {
  
  headers1 = (headers1 === "null") ? {} : headers1;
  headers2 = (headers2 === "null") ? {} : headers2;

  const keys1 = Object.keys(headers1);
  const keys2 = Object.keys(headers2);

  const empty_objects = keys1.length === 0 ? (keys2.length === 0 ? true : false) : false;

  const common_elements = keys1.every(key => 
    headers2.hasOwnProperty(key) && headers1[key].every(value => headers2[key].includes(value))
  );

  if (common_elements || empty_objects) {
    return 1;
  }
  return 0;
};
/**
 * This gives the json data for holding compared results
 * @returns standard json template with api metadata fields
 */
 const getResultJsonModel = () => ({
  path: 0,
  methods: 0,
  protocols: 0,
  hosts: 0,
  headers: 0
})

/**
 * this returns the array of api metadata filed values extracted 
 * from api json
 * @param {object} route 
 * @returns array 
 */

const extractRouteMetaData =  (route) => {
  let hosts = route.hasOwnProperty('hosts') && route.hosts !== undefined ? route.hosts : NULL
  let methods = route.hasOwnProperty('methods') && route.methods !== undefined ? route.methods : ["GET","POST","PUT","DELETE","PATCH"]
  let protocols = route.hasOwnProperty('protocols') && route.protocols !== undefined ? route.protocols : ["http", "https"]
  let headers = route.hasOwnProperty('headers') && route.headers !== undefined ? route.headers : NULL
  return [hosts, methods, protocols,headers]

  // const extractHeaders = (headers) => {
  //   return Object.entries(headers).map(([key, values]) => {
  //     return `${key}:${values.join('|')}`;
  //   }).join(',');
  // };
}


const getPRChangedFiles = async (pullRequestId) => {
  console.log(`pr id received is...${pullRequestId}`);
  const repoOwner = process.env.GITHUB_REPOSITORY.split("/")[0];
  const repoName = process.env.GITHUB_REPOSITORY.split("/")[1];
   
  const pr = await octokit.pulls.get({
    owner: repoOwner,
    repo: repoName,
    pull_number: Number(pullRequestId),
  });

  const files = await octokit.pulls.listFiles({
    owner: repoOwner,
    repo: repoName,
    pull_number: Number(pullRequestId),
    per_page: 100,
  });
  files.data.forEach(file => {
    const filePath = file.filename;
    const components = filePath.split('/');
    if (components[0] === VALIDATOR) {
      console.log('validator changes are there,rejecting pr');
      process.exit(1);
    }
    if (components[0] === '.github' || filePath.includes('.github')) {
      console.log('.github files are modified,rejecting pr');
      process.exit(1);
    }
    const fileName = components[components.length - 1];
    changedPrApiFiles.push(filePath);
    if (!envList.includes(components[0])) {
      envList.push(components[0]);
    }
    if (fileName === 'config.json' || fileName === 'swagger.json' || fileName === 'desc.md') {
      fileNames.push(components.length > 0 && components[2] === 'apis' ? components[components.length - 2] : "");
    }
    if (file.status && actionType[file.status.toUpperCase()] !== undefined) {
      actionType[file.status.toUpperCase()] = true;
    }
  });
  console.log('------changed files in pr -----');
  console.log(fileNames);
  console.log('-------------------------');
};


/**
 * Validate API before saving - Comprehensive validation including all checks
 * @param {string} envDir - Environment directory path (e.g., '/path/to/dev-snapshot/static')
 * @param {string} env - Environment name (e.g., 'dev-snapshot')
 * @param {object} apiMetadata - API metadata JSON (from apis.json)
 * @param {object} apiConfig - API config JSON (with api and plugins)
 * @param {boolean} checkPortal - Whether to check subscriptions against portal (default: false)
 * @returns {Promise<Array>} Array of validation errors (empty if no errors)
 */
async function validateApiBeforeSave(envDir, env, apiMetadata, apiConfig, checkPortal = false) {
  const validationErrors = [];
  
  // Clear global errors array
  errors.length = 0;
  
  // Clear api_map to avoid false duplicates from previous validations
  api_map.clear();
  const apiName = apiMetadata && apiMetadata.name ? apiMetadata.name : (apiConfig && apiConfig.api && apiConfig.api.name ? apiConfig.api.name : 'unknown');
  console.log(`[validateApiBeforeSave] DEBUG - apiMetadata:`, apiMetadata);
  console.log(`[validateApiBeforeSave] DEBUG - apiConfig.api:`, apiConfig && apiConfig.api);
  console.log(`[validateApiBeforeSave] Detected API name: ${apiName}`);
  fileNames.length = 0; // Clear existing fileNames
  // fileNames.push(apiName); // Add current API name  route.hasOwnProperty('protocols') && route.protocols !== undefined ? route.protocols : ["http", "https"]
  console.log(`[validateApiBeforeSave] Set fileNames to: [${fileNames}]`);
  
  try {
    console.log('Starting comprehensive API validation...');
    
    // Step 1: Validate JSON structure for the API directory
    console.log('Step 1: Validating JSON structure...');
    try {
      validateAllJsonStructure(envDir);
    } catch (err) {
      validationErrors.push(`JSON structure validation failed: ${err}`);
    }
    
    // Step 2: Populate reference data (groups, plans, auth types, etc.)
    console.log('Step 2: Populating reference data...');
    const [all_groups, all_apis, all_plans, all_auth_type, all_auth_methods, apiListUnfiltered] = populateData(envDir);
    
    // Step 3: Validate single API metadata
    console.log('Step 3: Validating API metadata...');
    const metadataErrors = validateSingleApiMetadata(
      apiMetadata,
      apiConfig,
      all_groups,
      all_plans,
      all_auth_type,
      all_auth_methods
    );
    if (metadataErrors && metadataErrors.length > 0) {
      validationErrors.push(...metadataErrors);
    }
    
    // Step 4: Check for duplicate service names
    console.log('Step 4: Checking duplicate service names...');
    const duplicates = checkDuplicateService(apiListUnfiltered);
    if (duplicates.length > 0) {
      validationErrors.push(`Duplicate service names found: ${duplicates.join(', ')}`);
    }
    
    // Step 5: Validate API config against all other APIs (duplicate paths, reserved paths, etc.)
    console.log('Step 5: Validating API config (duplicate paths, routes)...');
    validateApiConfigs(envDir, all_apis, apiConfig);
    
    // Step 6: Validate plugin schema against Kong
    console.log('Step 6: Validating plugin schema against Kong...');
    const pluginErrors = await validatePluginSchemaforapi(envDir, env, [], apiConfig);
    if (pluginErrors && pluginErrors.length > 0) {
      validationErrors.push(...pluginErrors);
    }
    
    // Step 7: Portal-based validations (only if checkPortal is true)
    if (checkPortal) {
      console.log('Step 7: Checking portal subscriptions...');
      
      try {
        // Initialize portal client if not already done
        if (!client.initialized) {
          await client.init();
        }
        
        // Get all active APIs from portal
        const allActiveAPIS = await client.getAPIS(env);
        console.log(`Fetched ${allActiveAPIS.length} active APIs from portal for environment: ${env}`);
        
        // Check if API ID changed with active subscriptions
        console.log('Step 7a: Checking API ID changes with subscriptions...');
        const [active_apps_id, affected_apis_id] = await CheckSubscriptionsOnApiIDChange(
          allActiveAPIS, 
          Object.values(all_apis), 
          env
        );
        if (active_apps_id.length > 0) {
          validationErrors.push(
            `Cannot change API ID: ${affected_apis_id.join(', ')} - Active subscriptions: ${active_apps_id.join(', ')}`
          );
        }
        
        // Check if plan changes affect subscriptions
        console.log('Step 7b: Checking plan changes with subscriptions...');
        const plansInConfig = helper.getConfigPlans(envDir);
        const planChangeResult = await CheckChangeInPlans(
          plansInConfig, 
          allActiveAPIS, 
          Object.values(all_apis), 
          env
        );
        if (planChangeResult && planChangeResult.length > 0) {
          for (const conflict of planChangeResult) {
            validationErrors.push(
              `Cannot change/delete plan: ${conflict.plan} - Has subscriptions: ${conflict.apis.join(', ')}`
            );
          }
        }
      } catch (portalError) {
        validationErrors.push(`Portal validation error: ${portalError.message || portalError}`);
      }
    }
    
    // Step 8: Validate markdown files
    console.log('Step 8: Validating markdown files...');
    try {
      const markdownResult = helper.validateAllMarkdownFiles(path.join(envDir, 'apis'));
      if (markdownResult.length > 0) {
        for (const missingDesc of markdownResult) {
          validationErrors.push(`Missing desc.md file at: ${missingDesc}`);
        }
      }
    } catch (err) {
      validationErrors.push(`Markdown validation error: ${err}`);
    }
    
    // Step 9: Collect any errors from global errors array
    if (errors.length > 0) {
      validationErrors.push(...errors);
    }
    
    console.log(`Validation complete. Found ${validationErrors.length} errors.`);
    
  } catch (error) {
    validationErrors.push(`Validation error: ${error.message || error}`);
  } finally {
    // Clean up
    errors.length = 0;
    api_map.clear();
  }
  
  return validationErrors;
}

process.on("unhandledRejection", (reason, p) => {});
// main(options.USE_PORTAL_API);



//do not remove the below code this for test cases/////////////////////
module.exports = { populateData, validateApiConfigs, validateApiMetadata, validateSchema, validatePluginSchema, openFile, validateAllJsonStructure, addApiConfigData, checkForDuplicateData, checkSubsetAndEquality,checkHeadersSubsetAndEquality, getResultJsonModel, extractRouteMetaData, getPRChangedFiles, getPRChangedFiles , openFile,validatePluginSchemaforapi,validateSingleApiMetadata,checkDuplicateService, validateApiBeforeSave};
module.exports.errors = errors;
// module.exports.main = main;
module.exports.CheckSubscriptionsOnApiDelete = CheckSubscriptionsOnApiDelete;
module.exports.CheckSubscriptionsOnApiIDChange = CheckSubscriptionsOnApiIDChange;
module.exports.CheckChangeInPlans = CheckChangeInPlans;
module.exports.getPRChangedFiles = getPRChangedFiles;
