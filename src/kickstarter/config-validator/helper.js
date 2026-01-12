const path = require(`path`);
const fs = require(`fs`);

//returns a map of plan->api[]
function getApiPlanMap(apis) {
  api_plans = new Map();
  for (api of apis) {
    for (plan of api.plans) {
      apis_p = [];
      if (api_plans.get(plan)) {
        prev = api_plans.get(plan);
        prev.push(api.id);
        api_plans.set(plan, prev);
      } else {
        apis_p.push(api.id);
        api_plans.set(plan, apis_p);
      }
    }
  }
  return api_plans;
}

function contains(array,value){
    for (key of array){
        if(key.id === value)
        return true;
    }
    return false;
}

function comparePlans(a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

function getConfigPlans(dirname) {
  plansFile = openFile(path.join(dirname, `plans`, `plans.json`));
  newPlans = plansFile.plans;
  return newPlans;
}

function openFile(path) {
    try {
      file = require(path);
      return file;
    } catch (e) {
      throw `Invalid JSON structure : ${path}`;
    }
  }

  function validateAllMarkdownFiles(dirName){
    result =[];
    files = fs.readdirSync(dirName);
        for(file of files){
            if(fs.statSync(path.join(dirName, file)).isDirectory()){
                directory = path.join(dirName, file);
                    if(!fs.existsSync(path.join(directory,'desc.md')))
                    {
                        result.push(directory);
                    }
            }
        }
        if(!fs.existsSync(path.join(dirName,'desc.md')))
        {
            result.push(dirName)
        }
        return result;
}
let findDuplicates = arr => arr.filter((item, index) => arr.indexOf(item) != index)

async function getDefaultEnvVariables(file_dir) {
  try {
    const envStaticPath = path.dirname(file_dir).split('static')[0] + 'static/env/';
    const defaultEnv = fs.readFileSync(path.join(envStaticPath, 'default.json'), 'utf8');
    const defaultEnvVariables = JSON.parse(defaultEnv);
    return defaultEnvVariables;
  } catch (error) {
    console.log(`Error reading default environment variables: ${error}`);
  }
}

exports.getDefaultEnvVariables = getDefaultEnvVariables;
exports.validateAllMarkdownFiles= validateAllMarkdownFiles;
exports.getConfigPlans = getConfigPlans;
exports.comparePlans = comparePlans;
exports.getApiPlanMap = getApiPlanMap;
exports.contains = contains;
exports.findDuplicates = findDuplicates;
