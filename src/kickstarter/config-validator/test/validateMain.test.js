const fs = require('fs');
const path = require('path');
const axios = require('axios');
const client = require('../portal-client'); // Adjust the path as necessary
const helper = require('../helper');

const { main , getPRChangedFiles} = require('../validate'); 

jest.mock('axios');
jest.mock('../portal-client');
jest.mock('../helper');
jest.mock('../validate', () => ({
  ...jest.requireActual('../validate'),
  getPRChangedFiles: jest.fn(),
}));
describe('main function', () => {
    it('should call makeDnsRestCall with the correct URLs', async () => {
      // Mock axios.get to resolve with a dummy response
      axios.get.mockResolvedValue({});
  
      await main();
  
      // Assert that axios.get was called with each dnsUrl
      const dnsUrls = [
        'https://api.dev-snapshot.clarivate.com',
        'https://api.dev-stable.clarivate.com',
        'https://api.test-perf.clarivate.com',
        'https://api.clarivate.com'
      ];
      
      dnsUrls.forEach(url => {
        expect(axios.get).toHaveBeenCalledWith(url);
      });
    });
    it('should handle errors in makeDnsRestCall correctly', async () => {
        // Mock axios.get to reject with an error
        const error = new Error('Network error');
        axios.get.mockRejectedValue(error);

        // Mock console.error to track error messages
        console.error = jest.fn();

        await main();

        const dnsUrls = [
            'https://api.dev-snapshot.clarivate.com',
            'https://api.dev-stable.clarivate.com',
            'https://api.test-perf.clarivate.com',
            'https://api.clarivate.com'
        ];
        for (const dnsUrl of dnsUrls) {
            expect(console.error).toHaveBeenCalledWith(`Error making DNS REST call to ${dnsUrl}:`, error);
        }

        // expect(axios.get).toHaveBeenCalledTimes(dnsUrls.length);
        expect(console.error).toHaveBeenCalledTimes(dnsUrls.length);
    });
});
describe('main function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
    it('should call makeDnsRestCall with the wrong URLs', async () => {
      // Mock axios.get to resolve with a dummy response
      axios.get.mockResolvedValue({});

      await main();

      // Assert that axios.get was called with each dnsUrl
      const dnsUrls = [
        'https://dummy1.com',
      ];
      
      dnsUrls.forEach(url => {
        expect(axios.get).not.toHaveBeenCalledWith(url);
      });
    });

    it('should initialize client if queryPortal is true', async () => {
      client.init.mockResolvedValue();
  
      await main(true);
  
      expect(client.init).toHaveBeenCalled();
    });

    it('should handle PR ID and call getPRChangedFiles', async () => {
      process.argv = ['node', 'script.js', '/path/to/repo', 'dummy-pr-id'];
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      getPRChangedFiles.mockResolvedValue(['pr id received is']);
    
      await main(false);
    
      // Check if any of the console logs contain the expected message
      const logMessages = consoleSpy.mock.calls.reduce((acc, call) => acc.concat(call), []);
      const containsExpectedMessage = logMessages.some(message => message.includes('pr id received is'));
      expect(containsExpectedMessage).toBe(true);
    });


});
