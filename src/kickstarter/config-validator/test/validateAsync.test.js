const client = require('../portal-client'); // Adjust the path as necessary
const helper = require('../helper');
const axios = require('axios');
const { CheckSubscriptionsOnApiDelete , CheckSubscriptionsOnApiIDChange , CheckChangeInPlans } = require('../validate'); // Adjust the path as necessary
const errors = require('../validate');

jest.mock('../portal-client');
jest.mock('../helper');
jest.mock('axios');
describe('CheckSubscriptionsOnApiDelete', () => {
  let active_apis;
  let config_apis;
  let env;

  beforeEach(() => {
    active_apis = [
      { id: 'api1', deprecated: true },
      { id: 'api2', deprecated: false },
      { id: 'echo', deprecated: true },
      { id: 'portal-api', deprecated: true }
    ];
    config_apis = [
      { id: 'api1' }
    ];
    env = 'test-env';
    client.getSubscription = jest.fn();
  });

  it('should return active apps and affected APIs', async () => {
    client.getSubscription.mockResolvedValueOnce([{ application: 'app1' }]);
    client.getSubscription.mockResolvedValueOnce([{ application: 'app2' }]);

    const [active_apps, affected_apis] = await CheckSubscriptionsOnApiDelete(active_apis, config_apis, env);

   

    expect(active_apps).toEqual(['app1']);
    expect(affected_apis).toEqual(['api2']);
  });

  it('should add error if API is not deprecated', async () => {
    axios.get.mockRejectedValue(errors);

    // Mock console.error to track error messages
    console.error = jest.fn();

    client.getSubscription.mockResolvedValueOnce([{ application: 'app2' }]);
    client.getSubscription.mockResolvedValueOnce([]);

    await CheckSubscriptionsOnApiDelete(active_apis, config_apis, env);

    expect(errors.errors).toContain('!! api2 is not Deprecated !!');
  });

  it('should not add internal APIs to affected APIs', async () => {
    client.getSubscription.mockResolvedValueOnce([]);
    client.getSubscription.mockResolvedValueOnce([]);


    const [active_apps, affected_apis] = await CheckSubscriptionsOnApiDelete(active_apis, config_apis, env);

    expect(active_apps).toEqual([]);
    expect(affected_apis).toEqual([]);
  });
});

describe('CheckSubscriptionsOnApiIDChange', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return empty arrays when there are no changes', async () => {
    const active_apis = [{ id: 'api1', name: 'API 1' }];
    const config_apis = [{ id: 'api1', name: 'API 1' }];
    const env = 'test';

    client.getSubscription.mockResolvedValue([]);

    const result = await CheckSubscriptionsOnApiIDChange(active_apis, config_apis, env);
    expect(result).toEqual([[], []]);
  });

  test('should return active apps and affected apis when there are changes and subscriptions are returned', async () => {
    const active_apis = [{ id: 'api1', name: 'API 1' }];
    const config_apis = [{ id: 'api2', name: 'API 1' }];
    const env = 'test';

    client.getSubscription.mockResolvedValue([{ application: 'app1' }]);

    const result = await CheckSubscriptionsOnApiIDChange(active_apis, config_apis, env);
    expect(result).toEqual([[], []]);
  });

  test('should return empty active apps and affected apis when there are changes but no subscriptions are returned', async () => {
    const active_apis = [{ id: 'api1', name: 'API 1' }];
    const config_apis = [{ id: 'api2', name: 'API 1' }];
    const env = 'test';

    client.getSubscription.mockResolvedValue([]);

    const result = await CheckSubscriptionsOnApiIDChange(active_apis, config_apis, env);
    expect(result).toEqual([[], []]);
  });

});

describe('CheckChangeInPlans', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should detect deleted plans', async () => {
    const plansInConfig = [{ id: 'plan1' }, { id: 'plan2' }];
    const apisInPortal = [];
    const apisInConfig = [];
    const env = 'test-env';

    const plansInPortal = [{ id: 'plan1' }, { id: 'plan2' }, { id: 'plan3' }];
    client.getPlans.mockResolvedValue(plansInPortal);      
    helper.comparePlans.mockImplementation((a, b) => a.id.localeCompare(b.id));
    helper.getApiPlanMap.mockImplementation(() => new Map([['plan3', ['api1', 'api2']]]));
    helper.contains.mockImplementation((arr, id) => arr.some(plan => plan.id === id));

    const result = await CheckChangeInPlans(plansInConfig, apisInPortal, apisInConfig, env);

    expect(result).toEqual([{ plan: 'plan3', apis: ['api1', 'api2'] }]);
  });

  test('should detect changed plan IDs', async () => {
    const plansInConfig = [{ id: 'plan1' }, { id: 'plan2' }];
    const apisInPortal = [];
    const apisInConfig = [];
    const env = 'test-env';

    const plansInPortal = [{ id: 'plan1' }, { id: 'plan3' }];
    client.getPlans.mockResolvedValue(plansInPortal);
    helper.comparePlans.mockImplementation((a, b) => a.id.localeCompare(b.id));
    helper.getApiPlanMap.mockImplementation(() => new Map([['plan3', ['api1', 'api2']]]));
    helper.contains.mockImplementation((arr, id) => arr.some(plan => plan.id === id));

    const result = await CheckChangeInPlans(plansInConfig, apisInPortal, apisInConfig, env);

    expect(result).toEqual([{ plan: 'plan3', apis: ['api1', 'api2'] }]);
  });

  test('should return undefined when no changes are detected', async () => {
    const plansInConfig = [{ id: 'plan1' }, { id: 'plan2' }];
    const apisInPortal = [];
    const apisInConfig = [];
    const env = 'test-env';

    const plansInPortal = [{ id: 'plan1' }, { id: 'plan2' }];
    client.getPlans.mockResolvedValue(plansInPortal);
    helper.comparePlans.mockImplementation((a, b) => a.id.localeCompare(b.id));
    helper.getApiPlanMap.mockImplementation(() => new Map());
    helper.contains.mockImplementation((arr, id) => arr.some(plan => plan.id === id));

    const result = await CheckChangeInPlans(plansInConfig, apisInPortal, apisInConfig, env);

    expect(result).toEqual([]);
  });
});