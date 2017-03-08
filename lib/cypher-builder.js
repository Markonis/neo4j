var _ = require('underscore');
var uuid = require('uuid');
var moment = require('moment');

module.exports = (function() {
  var Query = function() {
    var self = this;
    var rows = [];

    // Rows and clauses

    this.add = function(str) {
      rows.push(str);
      return this;
    };

    this.addClause = function(clause, parts, separator) {
      var str = null;
      var partsSeparator = separator || '';

      if (_.isString(parts)) {
        str = parts;
      }
      else if (_.isArray(parts)) {
        str = _.map(parts, function(part) {
          return _.isString(part) ? part : part.build(clause);
        }).join(partsSeparator);
      }
      else {
        throw new Error("Bad cypher clause! Parts bust be either a string or an array");
      }

      return this.add(clause + ' ' + str);
    };

    this.match = function(parts) {
      return this.addClause('MATCH', parts);
    };

    this.optionalMatch = function(parts) {
      return this.addClause('OPTIONAL MATCH', parts);
    };

    this.where = function(parts) {
      return this.addClause('WHERE', parts);
    };

    this.whereNot = function(parts) {
      return this.addClause('WHERE NOT', parts);
    };

    this.create = function(parts) {
      return this.addClause('CREATE', parts);
    };

    this.set = function(variable, params) {
      var props = _.extend(params || {}, {
        updatedAt: self.createUnixTimestamp()
      });

      var str = _.chain(props)
        .pairs().map(function(pair) {
          var str = variable + '.' + pair[0];
          str += ' = ' + pair[1];
          return str;
        }).value().join(', ');

      return this.addClause('SET', str);
    };

    this.addResultClause = function(clause, parts) {
      var str = _.map(parts, function(part) {
        if (_.isString(part)) {
          return part;
        }
        else {
          return part.expr + ' as ' + part.as;
        }
      }).join(', ');

      return this.add(clause + ' ' + str);
    };

    this.with = function(parts) {
      return this.addResultClause('WITH', parts);
    };

    this.return = function(parts) {
      return this.addResultClause('RETURN', parts);
    };

    this.json = function(object) {
      function toJson(param) {
        if (_.isObject(param)) {
          var str = _.chain(param).pairs().map(function(pair) {
            if (_.isObject(pair[1])) {
              return pair[0] + ': ' + toJson(pair[1]);
            }
            else {
              return pair[0] + ': ' + pair[1];
            }
          }).value().join(', ');
          return '{' + str + '}';
        }
        else {
          return param;
        }
      }

      return toJson(object);
    };

    this.case = function(parts, elsePart) {
      var str = _.map(parts, function(part, index) {
        return 'WHEN ' + part.when + ' THEN ' + part.then;
      }).join(' ');

      if (_.isString(elsePart)) str += ' ELSE ' + elsePart;

      return ['CASE', str, 'END'].join(' ');
    };

    this.collect = function(condition, expression) {
      return this.case([{
        when: condition + ' IS NOT NULL',
        then: 'COLLECT(' + expression + ')'
      }], '[]');
    };

    this.next = function() {
      this.with(['COUNT(*) as count']);
    };

    // Nodes

    this.node = function(name, params) {
      return {
        build: function(clause) {
          return '(' + name + self.paramsExpression(clause, params) + ')';
        }
      };
    };

    this.existingNode = function(name) {
      return '(' + name + ')';
    };

    // Relations

    function createRelation(name, params, dir) {
      return {
        build: function(clause) {
          var prefix = (dir == 'left') ? '<' : '';
          var suffix = (dir == 'right') ? '>' : '';
          var inner = name + self.paramsExpression(clause, params);
          return prefix + '-[' + inner + ']-' + suffix;
        }
      };
    }

    this.relation = function(name, params) {
      return createRelation(name, params, null);
    };

    this.relationRight = function(name, params) {
      return createRelation(name, params, 'right');
    };

    this.relationLeft = function(name, params) {
      return createRelation(name, params, 'left');
    };

    // Helpers

    this.paramsExpression = function(clause, params) {
      function decorate() {
        var result = _.clone(params || {});
        var timestamp = self.createUnixTimestamp();
        var uuid = self.createUuid();

        if (clause == 'CREATE') {
          result.uuid = result.uuid || uuid;
          result.createdAt = result.createdAt || timestamp;
          result.updatedAt = result.updatedAt || timestamp;
        }

        return result;
      }

      function stringify(params) {
        function keyValueStr(pair) {
          return pair[0] + ': ' + pair[1];
        }

        var str = _.chain(params).pairs()
          .map(keyValueStr).value().join(', ');

        return '{' + str + '}';
      }

      var include = params || clause == 'CREATE';
      if (include) {
        return ' ' + stringify(decorate(clause, params));
      }
      else {
        return '';
      }
    };

    this.createUnixTimestamp = function() {
      return moment().valueOf();
    };

    this.createUuid = function() {
      return '"' + uuid() + '"';
    };

    this.toCypher = function() {
      return rows.join(' ');
    };
  };

  function build(builder, params) {
    var query = new Query();
    builder(query, params);
    return query.toCypher();
  }

  return {
    Query: Query,
    build: build
  };

}());
