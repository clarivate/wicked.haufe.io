const fs = require('fs');
const path = require('path');
const validateApiConfigs = require('../validate.js');


describe('validateApiConfigs', () => {
  let dirName;
  let all_apis;
  let errors = [];


  beforeEach(() => {
    dirName = path.join(__dirname, 'testDir');
    console.log("dirName is ", dirName);

    all_apis = {
      'api1': { id: 'api1', name: 'api1' },
      'api2': { id: 'api2', name: 'api2' },
      'api3': { id: 'api3', name: 'api3' },
      'woslite': { id: "", name: true, desc: {} , plans: {}, requiredGroup: []},
    };
  });

  test('should validate API configurations correctly', () => {
       validateApiConfigs.validateApiConfigs(dirName, all_apis);
    expect(errors).toEqual([]);
  });

  test('should detect missing APIs in the directory', () => {
    validateApiConfigs.validateApiConfigs(dirName, all_apis);
    let errors = validateApiConfigs.errors;
    console.log("errors is ", errors);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('present in : api.json, absent in : directory, path')]));
  });

  test('should detect missing APIs in the apis.json', () => {
    validateApiConfigs.validateApiConfigs(dirName, all_apis);
    let errors = validateApiConfigs.errors;
    console.log("errors is ", errors);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('present in : directory, absent in : api.json, path :')]));
  });
  test('should detect Inconsistent API Id', () => {
    validateApiConfigs.validateApiConfigs(dirName, all_apis);
    let errors = validateApiConfigs.errors;
    console.log("errors is ", errors);
    expect(errors).toEqual(expect.arrayContaining([expect.stringContaining('Inconsistent API Id')]));
  });

///Other validations can be added here or those will be handled in other test files thanks to the modular approach

});