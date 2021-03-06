var jsTest = require('jenkins-js-test');
var renderTemplate = jsTest.requireSrcModule("steps/template.js").renderTemplate;
var assert = require("assert");


describe('Super simple template', function() {
  
      it('should render a template', function () {
        assert.equal("yeah 42 yeah", renderTemplate("yeah {{something}} yeah", {"something" : 42}));        
        assert.equal("yeah {{something}} yeah", renderTemplate("yeah {{something}} yeah", {}));        
        assert.equal("yeah 2 yeah", renderTemplate("yeah 2 yeah", {"something" : 42}));        
        assert.equal("yeah 1 2", renderTemplate("yeah {{s1}} {{s2}}", {"s1" : 1, "s2": 2}));        
        assert.equal("yeah 1 2", renderTemplate("yeah {{s1}} {{s2}}", {"s1" : 1}, {"s2": 2}));        
      }); 
    }
      
    );   
