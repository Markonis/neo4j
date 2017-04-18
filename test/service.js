var service = require(process.cwd() + '/lib/service.js');
var expect = require('expect.js');

describe('service', function() {
  beforeEach(function(done) {
    function clearDatabase() {
      return service.getSession()
        .run('MATCH (n) OPTIONAL MATCH (n)-[r]-() DELETE r, n');
    }

    clearDatabase().then(function() {
      done();
    });
  });

  describe('findNode(label, params)', function() {
    it('returns the node', function(done) {
      function createTestNode() {
        return service.runCypher({}, function(query) {
          query.create([query.node(':Test', {
            a: '"b"',
            c: '"d"',
            x: 1,
            y: 2
          })]);
        });
      }

      function findNode() {
        return service.findNode(':Test', {
          filter: {
            a: 'b',
            c: 'd'
          },
          props: ['x', 'y']
        });
      }

      function assertResult(result) {
        expect(result).to.eql({
          x: 1,
          y: 2
        });
      }

      createTestNode()
        .then(findNode)
        .then(assertResult)
        .then(done);
    });
  });
});
