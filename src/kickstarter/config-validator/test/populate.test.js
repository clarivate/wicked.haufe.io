// test/populate.test.js
const { populateData } = require('../validate');
const fs = require('fs');
const path = require('path');

const dirName = path.resolve(__dirname, '../');
const result = populateData(dirName);
describe('populateData', () => {
  it('should correctly populate data', () => {
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('should contain the expected keys of objects with required properties', () => {
    const objectsWithIdNameAdminApprover = result.filter(obj => obj.id && obj.name && obj.adminGroup && obj.approverGroup);
    
    objectsWithIdNameAdminApprover.forEach(obj => {
      // Check that each property is truthy and not null
      expect(obj.id).toBeTruthy();
      expect(obj.id).not.toBeNull();
      
      expect(obj.name).toBeTruthy();
      expect(obj.name).not.toBeNull();
      
      expect(obj.adminGroup).toBeTruthy();
      expect(obj.adminGroup).not.toBeNull();
      
      expect(obj.approverGroup).toBeTruthy();
      expect(obj.approverGroup).not.toBeNull();
    });
  
  
});

it('should contain the expected Auth methods', () => {
  const expectedObject = { 'key-auth': 'key-auth', oauth2: 'oauth2', none: 'none' };
    const objectExists = result.some(item => 
      item['key-auth'] === expectedObject['key-auth'] &&
      item.oauth2 === expectedObject.oauth2 &&
      item.none === expectedObject.none
    );
    expect(objectExists).toBe(true);
});

it('should contain the expected plan keys of objects with required properties', () => {
  const objectsWithPlanConfig = result.filter(obj => 
    obj.id && obj.name && obj.desc && obj.needsApproval && obj.config
  );
  
  objectsWithPlanConfig.forEach(obj => {
    // Check that each property is present and not null
    expect(obj.id).toBeTruthy();
    expect(obj.id).not.toBeNull();
    
    expect(obj.name).toBeTruthy();
    expect(obj.name).not.toBeNull();
    
    expect(obj.desc).toBeTruthy();
    expect(obj.desc).not.toBeNull();
    
    expect(obj.needsApproval).toBeTruthy();
    expect(obj.needsApproval).not.toBeNull();
    
    expect(obj.config).toBeTruthy();
    expect(obj.config).not.toBeNull();
  });
});
it('should contain the expected APIs json file keys and properties', () => {
 const apiJson = result.filter(obj => 
     obj.id && obj.name && obj.desc && obj.auth && obj.tags && obj.plans && (obj.requiredGroup || obj.registrationPool || obj.businessSegment || obj.productGroup || (obj.owners && Array.isArray(obj.owners)))
 );
   apiJson.forEach(obj => {
    // Check that each property is present and not null
    expect(obj.id).toBeTruthy();
    expect(obj.id).not.toBeNull();
    
    expect(obj.name).toBeTruthy();
    expect(obj.name).not.toBeNull();
    
    expect(obj.desc).toBeTruthy();
    
    expect(obj.auth).toBeTruthy();

    
    expect(obj.tags).toBeTruthy();
    expect(obj.tags).not.toBeNull();
    
    expect(obj.plans).toBeTruthy();
    expect(obj.plans).not.toBeNull();
    
    expect(obj.requiredGroup || obj.registrationPool || obj.businessSegment || obj.productGroup || (obj.owners && Array.isArray(obj.owners))).toBeTruthy();
    expect(obj.requiredGroup || obj.registrationPool || obj.businessSegment || obj.productGroup || (obj.owners && Array.isArray(obj.owners))).not.toBeNull();
});

});
});
  
  
