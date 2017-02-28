var Neo4j = require(process.cwd() + '/index.js');
var expect = require('expect.js');
var neo4j = require('neo4j-driver').v1;

describe('Neo4j', function() {
  beforeEach(function() {
    this.neo4j = new Neo4j({
      url: 'test-url',
      user: 'test-user',
      password: 'test-password'
    });
  });

  describe('convertNumbers(rawResult)', function(bundle) {
    it('converts neo4j number type to standard js numbers', function() {
      var rawResult = {
        records: [
          {
            _fields: [{
              string: 'a',
              number: neo4j.int(123),
              array: ['b', 5, neo4j.int(123)]
            }]
          }
        ]
      };

      var result = this.neo4j.convertNumbers(rawResult);

      expect(result).to.eql({
        records: [
          {
            _fields: [{
              string: 'a',
              number: 123,
              array: ['b', 5, 123]
              }]
            }
          ]
      });
    });
  });
});
