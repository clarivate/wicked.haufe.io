const path = require('path');
const fs = require('fs');
const { validateSchema, populateData } = require('../validate');
// const apisRules = require('../../config-validator/apiConfigRules.json');
const apisRules = require('../apiConfigRules.json'); //

//When you require a JSON file, Node.js automatically parses the JSON and returns the resulting JavaScript object.

jest.mock('fs');
jest.mock('path');
// const groups = require('../../config-validator/test/mockDir/groups/groups.json');

describe('validateSchema Function Tests', () => {
  it('should validate a correct JSON structure without errors', () => {
    const validJson = {
      api: {
        name: "ExampleAPI",
        upstream_url: "http://example.com",
        routes: [
          {
            paths: ["/example"],
            strip_path: true,
            plugins: []
          }
        ],
        host: "$PORTAL_NETWORK_APIHOST",
        retries: 5,
        enable_routes: true
      },
      plugins: []
    };
    const errors = validateSchema(validJson, apisRules);
    expect(errors).toEqual([]);
  });

  it('should return errors for an incorrect JSON structure', () => {
    const invalidJson = {
      api: {
        name: "ExampleAPI",
        upstream_url: 123, // Should be a string
        routes: [
          {
            strip_path: "true", // Should be a boolean
            plugins: [] // Should be an array
          }
        ],
        retries: "five", // Should be a number
        enable_routes: "yes" // Should be a boolean
      },
      plugins: [] // Should be an array
    };
    const errors = validateSchema(invalidJson, apisRules);
    console.log(errors);
    // expect(errors.length).toBeGreaterThan(0); // Expect some errors
    expect(errors).toContainEqual(expect.stringContaining("ExampleAPI----> api[upstream_url] must be a string"));
    expect(errors).toContainEqual(expect.stringContaining("ExampleAPI----> api[routes][0][strip_path] must be a boolean"));
    expect(errors).toContainEqual(expect.stringContaining("ExampleAPI----> api[retries] must be a number"));
    expect(errors).toContainEqual(expect.stringContaining("ExampleAPI----> api[enable_routes] must be a boolean"));
  });
});

