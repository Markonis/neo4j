var expect = require('expect.js');
var cypherBuilder = require(process.cwd() + '/lib/cypher-builder.js');

describe('cypherBuilder.Query', function() {
  beforeEach(function() {
    this.query = new cypherBuilder.Query();
    this.query.createUnixTimestamp = function() {
      return 100;
    };
    this.query.createUuid = function() {
      return '"1"';
    };
  });

  describe('add(str)', function() {
    it('adds a string as new row', function() {
      this.query.add('Test 1');
      this.query.add('Test 2');
      var result = this.query.toCypher();
      expect(result).to.eql('Test 1 Test 2');
    });
  });

  describe('addClause(clause, parts, separator)', function() {
    it('adds a simple string clause', function() {
      this.query.addClause('TEST', 'test parts');
      var result = this.query.toCypher();
      expect(result).to.eql('TEST test parts');
    });

    it('adds an array of strings', function() {
      this.query.addClause('TEST', ['1', '2', '3']);
      var result = this.query.toCypher();
      expect(result).to.eql('TEST 123');
    });

    it('adds an array of tools and strings', function() {
      this.query.addClause('TEST', [{
          build: function(clause) {
            return clause.toLowerCase() + '-tool';
          }
        },
        '1',
        '2'
      ]);
      var result = this.query.toCypher();
      expect(result).to.eql('TEST test-tool12');
    });

    it('joins using custom separator', function() {
      this.query.addClause('TEST', ['1', '2', '3'], ', ');
      var result = this.query.toCypher();
      expect(result).to.eql('TEST 1, 2, 3');
    });
  });

  describe('addResultClause(clause, parts)', function() {
    it('joins the parts', function() {
      this.query.addResultClause('TEST', [
        'a',
        'b', {
          expr: 'c',
          as: 'd'
        }
      ]);

      expect(this.query.toCypher()).to.eql('TEST a, b, c as d');
    });
  });

  describe('set(variable, params)', function() {
    it('adds updatedAt timestamp and builds query', function() {
      this.query.set('user', {
        name: '"Test"',
        score: 10
      });

      var result = this.query.toCypher();
      expect(result).to.eql('SET user.name = "Test", user.score = 10, user.updatedAt = 100');
    });
  });

  describe('json(object', function() {
    it('creates a cypher json representation', function() {
      var result = this.query.json({
        a: 1,
        b: 2,
        c: {
          x: '"3"',
          y: {
            p: 4,
            q: 5
          }
        }
      });

      expect(result).to.eql('{a: 1, b: 2, c: {x: "3", y: {p: 4, q: 5}}}');
    });
  });

  describe('case(condition, parts)', function() {
    it('constructs a valid case expression', function() {
      var result = this.query.case([{
        when: 1,
        then: '2'
      }, {
        when: 3,
        then: 4
      }], '5');

      expect(result).to.eql('CASE WHEN 1 THEN 2 WHEN 3 THEN 4 ELSE 5 END');
    });
  });

  describe('collect(condition, expression)', function() {
    it('creates a case statement', function() {
      var result = this.query.collect('test', 'test.name');
      expect(result).to.eql('CASE WHEN test IS NOT NULL THEN COLLECT(test.name) ELSE [] END');
    });
  });

  describe('node(name, params)', function() {
    it('creates a node with params', function() {
      var result = this.query.node('u:User', {
        name: '"Test"',
        score: 10
      }).build('TEST');
      expect(result).to.eql('(u:User {name: "Test", score: 10})');
    });

    it('creates a node without params', function() {
      var result = this.query.node('u:User').build('TEST');
      expect(result).to.eql('(u:User)');
    });

    it('creates a node and adds timestamps and uuid', function() {
      var result = this.query.node('u:User', {
        name: '"Test"',
        score: 10
      }).build('CREATE');
      expect(result).to.eql('(u:User {name: "Test", score: 10, uuid: "1", createdAt: 100, updatedAt: 100})');
    });
  });

  describe('relationRight(name, params)', function() {
    it('creates a relation with params', function() {
      var result = this.query.relationRight(':TAGGED', {
        param: '"test"'
      });
      expect(result.build('TEST')).to.eql('-[:TAGGED {param: "test"}]->');
    });

    it('creates a relation without params', function() {
      var result = this.query.relationRight(':TAGGED');
      expect(result.build('TEST')).to.eql('-[:TAGGED]->');
    });

    it('creates a relation with timestamps and uuid', function() {
      var result = this.query.relationRight(':TAGGED');
      expect(result.build('CREATE')).to.eql('-[:TAGGED {uuid: "1", createdAt: 100, updatedAt: 100}]->');
    });
  });

  describe('relationLeft(name, params)', function() {
    it('creates a relation without params', function() {
      var result = this.query.relationLeft(':TEST');
      expect(result.build()).to.eql('<-[:TEST]-');
    });
  });

  describe('relation(name, params)', function() {
    it('creates a relation without params', function() {
      var result = this.query.relation(':TEST');
      expect(result.build()).to.eql('-[:TEST]-');
    });
  });

  it('can chain methods', function() {
    var result = this.query
      .match('(u:User)')
      .where('u.name = "Marko"')
      .add('RETURN u')
      .toCypher();

    expect(result).to.eql('MATCH (u:User) WHERE u.name = "Marko" RETURN u');
  });
});

describe('cypherBuilder.build(builder)', function() {
  it('returns a cypher query', function() {
    var result = cypherBuilder.build(function(q) {
      q.createUuid = function() {
        return '"1"';
      };

      q.createUnixTimestamp = function() {
        return 100;
      };

      q.match([
        q.node('u:User', {
          name: '"Marko"',
          age: 10
        }),
        q.relationRight(':PLAYED'),
        q.node('g:Game')
      ]).where('g.score > 100').create([
        q.existingNode('u'),
        q.relationRight(':TAGGED'),
        q.node(':Tag', {
          label: '"Interesting"'
        })
      ]);
    });

    expect(result).to.eql('MATCH (u:User {name: "Marko", age: 10})-[:PLAYED]->(g:Game) WHERE g.score > 100 CREATE (u)-[:TAGGED {uuid: "1", createdAt: 100, updatedAt: 100}]->(:Tag {label: "Interesting", uuid: "1", createdAt: 100, updatedAt: 100})');
  });
});
