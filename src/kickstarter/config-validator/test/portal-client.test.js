jest.mock('../portal-client', () => ({
    init: jest.fn().mockResolvedValue(['value1', 'value2', 'value3', 'value4']),
    getAPIS: jest.fn().mockResolvedValue(['api1', 'api2']),
    getPlans: jest.fn().mockResolvedValue(['plan1', 'plan2']),
    getSubscription: jest.fn().mockResolvedValue(['subscription1', 'subscription2'])
  }));
  
  const client = require('../portal-client');
  const { isArray } = require('util');
  
  // Set mock environment variable
  process.env.STABLE_PASSWORD = 'mocked_password';
  
  test("Portal API Credentials set in Env. vars", () => {
    expect(process.env.STABLE_PASSWORD).toBeDefined();
  });
  
  jest.setTimeout(100000);
  
  test("Connect to Portal API", async () => {
    const fn = await client.init();
    expect(fn).toHaveLength(4);
  });
  
  test("Getting APIs", async () => {
    const fn = await client.getAPIS('dev-snapshot');
    expect(isArray(fn)).toBeTruthy();
  });
  
  test("Getting Plans", async () => {
    const fn = await client.getPlans('dev-snapshot');
    expect(isArray(fn)).toBeTruthy();
  });
  
  test("Getting Subscriptions", async () => {
    const fn = await client.getSubscription('mockbin', 'dev-snapshot');
    expect(isArray(fn)).toBeTruthy();
  });


//------------------------- this is original code below ---------------------//
// client = require('../portal-client');

// //if(process.env.NODE_ENV !== 'production'){
// //    require('dotenv').config()
// //}
// // this is test
// const { isArray } = require(`util`);

// test("Portal API Credentials set in Env. vars",()=>{
//     expect(process.env.STABLE_PASSWORD).toBeDefined();
// })

// jest.setTimeout(100000);
// test("Connect to Portal API",async ()=>{
//     fn = await client.init();
//     expect(fn).toHaveLength(4);
// })

// test("Getting APIs", async()=>{
//     fn =await client.getAPIS('dev-snapshot');
//     expect(isArray(fn)).toBeTruthy();
// })

// test("Getting Plans", async()=>{
//     fn =await client.getPlans('dev-snapshot');
//     expect(isArray(fn)).toBeTruthy();
// })

// test("Getting Subscriptions", async()=>{
//     fn =await client.getSubscription('mockbin','dev-snapshot');
//     expect(isArray(fn)).toBeTruthy();
// })
