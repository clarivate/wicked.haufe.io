jest.mock('aws-sdk', () => {
    const mockSSM = {
      getParameter: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Parameter: {
            Value: 'mocked-secret-value'
          }
        })
      })
    };
    return {
      config: {
        loadFromPath: jest.fn(),
        update: jest.fn()
      },
      SSM: jest.fn(() => mockSSM)
    };
  });
  
  var ssm = require('../ssm_client.js');
  
  test("Connection to Secrets Manager", async () => {
    expect(await ssm.getSecret('SNAPSHOT_USERNAME')).toBe('mocked-secret-value');
  });
















// var AWS = require('aws-sdk');
// AWS.config.loadFromPath('./config/ssm_config.json');
// var ssm = require('../ssm_client.js');

// test("Connection to Secrets Manager",async ()=>{
//     expect(await ssm.getSecret('SNAPSHOT_USERNAME')).toBe('api.admin@clarivate.com')
// })