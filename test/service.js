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

  describe('createNode(label, params)', function() {
    it('creates a new node with the given attributes', function(done) {
      function createNode() {
        return service.createNode(':Test', {
          props: ['uuid', 'name', 'age'],
          attrs: {
            name: 'Test',
            age: 42
          }
        });
      }

      function assertResult(result) {
        expect(result.name).to.eql('Test');
        expect(result.age).to.eql(42);
      }

      function findNode() {
        return service.runCypher({}, function(q) {
          q.match([q.node('t:Test')]);
          q.return([q.json({
            name: 't.name'
          })]);
        });
      }

      function assertFound(result) {
        expect(result.name).to.eql('Test');
      }

      createNode()
        .then(assertResult)
        .then(findNode)
        .then(assertFound)
        .then(done);
    });
  });

  describe('findOrCreateNode(label, params)', function() {
    it('returns an existing node', function(done) {
      function createTestNode() {
        return service.createNode(':Test', {
          props: ['uuid', 'name', 'age'],
          attrs: {
            uuid: 'test-uuid',
            name: 'Test',
            age: 42
          }
        });
      }

      function findOrCreateNode() {
        return service.findOrCreateNode(':Test', {
          props: ['uuid', 'name', 'age'],
          attrs: {
            name: 'Test',
            age: 42
          }
        });
      }

      function assertResult(result) {
        expect(result.uuid).to.eql('test-uuid');
        expect(result.name).to.eql('Test');
        expect(result.age).to.eql(42);
      }

      function getCount() {
        return service.runCypher({}, function(q) {
          q.match([q.node('t:Test')]);
          q.return([q.json({
            count: 'COUNT(t)'
          })]);
        });
      }

      function assertCount(result) {
        expect(result.count).to.eql(1);
      }

      createTestNode()
        .then(findOrCreateNode)
        .then(assertResult)
        .then(getCount)
        .then(assertCount)
        .then(done);
    });

    it('creates a new node', function(done) {
      function createTestNode() {
        return service.createNode(':Test', {
          props: ['uuid', 'name', 'age'],
          attrs: {
            uuid: 'test-uuid',
            name: 'Test',
            age: 42
          }
        });
      }

      function findOrCreateNode() {
        return service.findOrCreateNode(':Test', {
          props: ['uuid', 'name', 'age'],
          attrs: {
            name: 'Test',
            age: 43
          }
        });
      }

      function assertResult(result) {
        expect(result.name).to.eql('Test');
        expect(result.age).to.eql(43);
      }

      function getCount() {
        return service.runCypher({}, function(q) {
          q.match([q.node('t:Test')]);
          q.return([q.json({
            count: 'COUNT(t)'
          })]);
        });
      }

      function assertCount(result) {
        expect(result.count).to.eql(2);
      }

      createTestNode()
        .then(findOrCreateNode)
        .then(assertResult)
        .then(getCount)
        .then(assertCount)
        .then(done);
    });
  });
});
