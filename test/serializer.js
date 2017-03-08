var serializer = require(process.cwd() + '/lib/serializer.js');
var SObject = serializer.SObject;
var Serializer = serializer.Serializer;
var Query = require(process.cwd() + '/lib/cypher-builder.js').Query;
var expect = require('expect.js');

describe('apiSerializer', function() {
  describe('SObject', function() {
    describe('getAtPath(path)', function() {
      it('returns direct properties', function() {
        var sObject = new SObject('test', {
          a: 1,
          b: 2
        });

        var result = sObject.getAtPath(['a']);
        expect(result).to.be(1);
      });

      it('returns nested properties', function() {
        var sObject = new SObject('test', {
          a: 1,
          b: new SObject('test', {
            c: new SObject('test', {
              d: 'test-d'
            })
          }),
          e: [new SObject('test', {
            f: [new SObject('test', {
              g: 'test-g'
            })]
          })]
        });

        var testD = sObject.getAtPath(['b', 'c', 'd']);
        expect(testD).to.eql('test-d');

        var testG = sObject.getAtPath(['e', 'f', 'g']);
        expect(testG).to.eql('test-g');
      });
    });

    describe('replaceAtPath(path)', function() {
      it('replaces direct properties', function() {
        var sObject = new SObject('test', {
          a: 1,
          b: 2
        });

        sObject.replaceAtPath(['a'], 3);
        var result = sObject.getAtPath(['a']);
        expect(result).to.be(3);
      });

      it('replaces nested properties', function() {
        var sObject = new SObject('test', {
          a: 1,
          b: new SObject('test', {
            c: new SObject('test', {
              d: 'test-d'
            })
          })
        });

        sObject.replaceAtPath(['b', 'c', 'd'], 'TEST-D');
        var testD = sObject.getAtPath(['b', 'c', 'd']);
        expect(testD).to.eql('TEST-D');
      });
    });
  });

  describe('Serializer', function() {
    beforeEach(function() {
      this.serializer = new Serializer(null);
    });

    describe('findResolvables', function() {
      beforeEach(function() {
        var c = new SObject('c', {
          x: '1'
        });

        var dyq = new SObject('dyq', {
          w: '12'
        });

        var dy = new SObject('dy', {
          p: '3',
          q: [dyq]
        });

        var d = new SObject('d', {
          x: '1',
          y: dy,
        });

        this.main = new SObject('test', {
          a: '1',
          b: '2',
          c: c,
          d: [d]
        });

        this.expected = [{
          type: 'array',
          object: dyq,
          path: ['d', 'y', 'q']
        }, {
          type: 'object',
          object: dy,
          path: ['d', 'y']
        }, {
          type: 'array',
          object: d,
          path: ['d']
        }, {
          type: 'object',
          object: c,
          path: ['c']
        }];
      });

      it('finds resolvables in SObject and returs a path to them', function() {
        var result = this.serializer.findResolvables(this.main);

        this.expected.push({
          type: 'object',
          object: this.main,
          path: []
        });

        expect(result).to.eql(this.expected);
      });

      it('finds resolvables in Array and returns a path to them', function() {
        var result = this.serializer.findResolvables([this.main]);

        this.expected.push({
          type: 'array',
          object: this.main,
          path: []
        });

        expect(result).to.eql(this.expected);
      });
    });

    describe('return', function() {
      it('returns simple object as json', function() {
        var query = new Query();
        var s = new Serializer(query);

        s.return(new SObject('test', {
          a: 'test.a',
          b: 'test.b'
        }));

        var cypher = query.toCypher();
        expect(cypher).to.eql('RETURN {a: test.a, b: test.b}');
      });

      it('returns nested object as json', function() {
        var query = new Query();
        var s = new Serializer(query);

        s.return(new SObject('root', {
          a: 'root.a',
          b: new SObject('b', {
            x: 'b.x',
            y: 'b.y',
            z: [new SObject('z', {
              p: 'z.p',
              q: 'z.q',
              r: [new SObject('r', {
                m: 'r.m',
                n: 'r.n'
              })]
            })]
          })
        }));

        var cypher = query.toCypher();
        expect(cypher).to.eql('WITH z, b, root, CASE WHEN r IS NOT NULL THEN COLLECT({m: r.m, n: r.n}) ELSE [] END as r WITH b, root, CASE WHEN z IS NOT NULL THEN COLLECT({p: z.p, q: z.q, r: r}) ELSE [] END as z WITH root, {x: b.x, y: b.y, z: z} as b RETURN {a: root.a, b: b}');
      });

      it('returns nested object in array as json', function() {
        var query = new Query();
        var s = new Serializer(query);

        s.return([new SObject('root', {
          a: 'root.a',
          b: new SObject('b', {
            x: 'b.x',
            y: 'b.y',
            z: [new SObject('z', {
              p: 'z.p',
              q: 'z.q',
              r: [new SObject('r', {
                m: 'r.m',
                n: 'r.n'
              })]
            })]
          })
        })]);

        var cypher = query.toCypher();
        expect(cypher).to.eql('WITH z, b, root, CASE WHEN r IS NOT NULL THEN COLLECT({m: r.m, n: r.n}) ELSE [] END as r WITH b, root, CASE WHEN z IS NOT NULL THEN COLLECT({p: z.p, q: z.q, r: r}) ELSE [] END as z WITH root, {x: b.x, y: b.y, z: z} as b RETURN CASE WHEN root IS NOT NULL THEN COLLECT({a: root.a, b: b}) ELSE [] END');
      });
    });
  });
});
