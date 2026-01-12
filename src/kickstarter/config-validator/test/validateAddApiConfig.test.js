const { addApiConfigData } = require('../validate.js');
const { validateApiMetadata } = require('../validate');
const path = require('path');
const fs = require('fs');


jest.mock('fs');

// validateAddApiConfig.test.js
//just for tsting directory name and file name and apis name should be same with mockdata
describe('addApiConfigData', () => {
    let apiConfigData ;

    beforeEach(() => {
        // Reset the apiConfigData before each test
        apiConfigData = {
            api: {
                name: 'test-api',
                version: '1.0.0',
                routes: [
                    {
                        paths: ['/test'],
                        // Add other necessary route properties here
                    }
                ]
            },
            config: {
                endpoint: '/test'
            }
        };
    });

    it('Test Case 1: should add valid API configuration data', () => {
        const api = {
            api: {
                name: 'test-api',
                version: '1.0.0',
                routes: [
                    {
                        paths: ['/test'],
                        // Add other necessary route properties here
                    }
                ]
            },
            config: {
                endpoint: '/test'
            }
        };

        addApiConfigData(api);

        expect(apiConfigData).toEqual(api);
    });

    it('Test Case 2: should throw an error for invalid API configuration', () => {
        const invalidApi = {
            api: {
                version: '1.0.0',
                routes: []
            },
            config: {
                endpoint: '/test'
            }
        };

        expect(addApiConfigData(apiConfigData)).not.toEqual(invalidApi);
    });

    it('Test Case 3: should throw an error if api or api.name is missing', () => {
        const invalidApi1 = {
            config: {
                endpoint: '/test'
            }
        };

        const invalidApi2 = {
            api: {
                routes: []
            },
            config: {
                endpoint: '/test'
            }
        };
        expect(addApiConfigData(apiConfigData)).not.toEqual(invalidApi1);
        expect(addApiConfigData(apiConfigData)).not.toEqual(invalidApi2);
    });
    it('Test Case 4: should handle matched records correctly', () => {
        const api = {
            api: {
                name: 'test-api',
                version: '1.0.0',
                routes: [
                    {
                        paths: ['/test'],
                        // Add other necessary route properties here
                    }
                ]
            },
            config: {
                endpoint: '/test'
            }
        };

        addApiConfigData(api);

        // Assuming addApiConfigData updates apiConfigData in some way for matched records
        // Add assertions to check the expected behavior for matched records
        expect(apiConfigData.api.name).toBe('test-api');
        expect(apiConfigData.api.version).toBe('1.0.0');
    });
    it('Test Case 5: should handle unmatched records correctly', () => {
        const unmatchedApi = {
            api: {
                name: 'unmatched-api',
                version: '1.0.0',
                routes: [
                    {
                        paths: ['/unmatched'],
                        // Add other necessary route properties here
                    }
                ]
            },
            config: {
                endpoint: '/unmatched'
            }
        };

        addApiConfigData(unmatchedApi);

        // Assuming addApiConfigData updates apiConfigData in some way for unmatched records
        // Add assertions to check the expected behavior for unmatched records
        expect(apiConfigData.api.name).not.toBe('unmatched-api');
        expect(apiConfigData.api.routes[0].paths).not.toContain('/unmatched');
    });

    it('Test Case 6: should handle if condition for unmatched records', () => {
        const unmatchedApi = {
            api: {
                name: 'unmatched-api',
                version: '1.0.0',
                routes: [
                    {
                        paths: ['/unmatched'],
                        // Add other necessary route properties here
                    }
                ]
            },
            config: {
                endpoint: '/unmatched'
            }
        };

        addApiConfigData(unmatchedApi);

        // Assuming addApiConfigData updates apiConfigData in some way for unmatched records
        // Add assertions to check the expected behavior for the if condition
        expect(apiConfigData.api.name).not.toBe('unmatched-api');
        expect(apiConfigData.api.routes[0].paths).not.toContain('/unmatched');
    });
});


describe('validateApiMetadata', () => {
    let errors;
  
    beforeEach(() => {
      errors = [];
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'error').mockImplementation(() => {});
    });
  
    afterEach(() => {
      jest.restoreAllMocks();
    });
  
    it('should validate API metadata correctly', () => {
      const dirName = path.join(__dirname, 'mockDir');
      const all_groups = { group1: {}, group2: {} };
      const all_plans = { plan1: {}, plan2: {} };
      const all_auth_type = { "key-auth": "key-auth", oauth2: "oauth2", none: "none" };
      const all_auth_methods = { method1: 'method1', method2: 'method2' };
  
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('apis.json')) {
          return JSON.stringify({
            apis: [
              { id: 'api1', name: 'API 1', plans: ['plan1'], authMethods: ['method1'] },
              { id: 'api2', name: 'API 2', plans: 'plan2', authMethods: ['method2'] }
            ]
          });
        } else if (filePath.includes('generic-api-metadata.json')) {
          return JSON.stringify({
            id: { type: 'string', mandatory: true },
            name: { type: 'string', mandatory: true },
            plans: { type: 'array', elements: { type: 'string' } },
            authMethods: { type: 'array', elements: { type: 'string' } }
          });
        }
        return '{}';
      });
  
      validateApiMetadata(dirName, all_groups, all_plans, all_auth_type, all_auth_methods);
  
      expect(errors).toEqual([]);
    });
  
    it('should report errors for invalid API metadata', () => {
      const dirName = path.join(__dirname, 'mockDir');
      const all_groups = { group1: {}, group2: {} };
      const all_plans = { plan1: {}, plan2: {} };
      const all_auth_type = { "key-auth": "key-auth", oauth2: "oauth2", none: "none" };
      const all_auth_methods = { method1: 'method1', method2: 'method2' };
  
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('apis.json')) {
          return JSON.stringify({
            apis: [
              { id: 'api1', name: 'API 1', plans: ['invalid_plan'], authMethods: ['invalid_method'] }
            ]
          });
        } else if (filePath.includes('generic-api-metadata.json')) {
          return JSON.stringify({
            id: { type: 'string', mandatory: true },
            name: { type: 'string', mandatory: true },
            plans: { type: 'array', elements: { type: 'string' } },
            authMethods: { type: 'array', elements: { type: 'string' } }
          });
        }
        return '{}';
      });
  
      validateApiMetadata(dirName, all_groups, all_plans, all_auth_type, all_auth_methods);
  
      expect(errors).not.toEqual([
        'Invalid plan : invalid_plan in api : api1, path: ' + path.join(dirName, 'apis', 'apis.json'),
        'Invalid auth method : invalid_method in api : api1, path: ' + path.join(dirName, 'apis', 'apis.json')
      ]);
    });
  });