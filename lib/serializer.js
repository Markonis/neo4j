var _ = require('underscore');

module.exports = (function() {
  var SObject = function(variable, propsObject) {
    this.getVariable = function() {
      return variable;
    };

    this.getPropsObject = function() {
      return propsObject;
    };

    this.getAtPath = function(path) {
      if (path.length === 0) return this;

      var value = this.getPropsObject()[path[0]];

      if (value instanceof SObject) {
        return value.getAtPath(_.rest(path));
      }
      else if (_.isArray(value)) {
        return value[0].getAtPath(_.rest(path));
      }
      else {
        return value;
      }
    };

    this.replaceAtPath = function(path, value) {
      var property = _.last(path);
      var sObject = this.getAtPath(_.initial(path));
      sObject.getPropsObject()[property] = value;
    };
  };

  var Serializer = function(query) {
    this.getQuery = function() {
      return query;
    };
  };

  Serializer.prototype.findResolvables = function(value) {
    var result = [];

    function findInValue(value, path) {
      if (_.isArray(value)) {
        findInObject(value[0], path);
        result.push({
          type: 'array',
          object: value[0],
          path: path
        });
      }
      else if (value instanceof SObject) {
        findInObject(value, path);
        result.push({
          type: 'object',
          object: value,
          path: path
        });
      }
    }

    function findInObject(sObject, path) {
      _.chain(sObject.getPropsObject()).pairs().each(function(pair) {
        var newPath = _.clone(path);
        newPath.push(pair[0]);
        findInValue(pair[1], newPath);
      });
    }

    findInValue(value, []);

    return _.sortBy(result, function(item) {
      return item.path.length;
    }).reverse();
  };

  Serializer.prototype.resolvedExpr = function(resolvable) {
    var query = this.getQuery();

    if (resolvable.type === 'object') {
      return query.json(resolvable.object.getPropsObject());
    }
    else {
      return query.collect(resolvable.object.getVariable(),
        query.json(resolvable.object.getPropsObject()));
    }
  };

  Serializer.prototype.removeVariable = function(array, variable) {
    var index = _.indexOf(array, variable);
    var newArray = _.clone(array);
    newArray.splice(index, 1);
    return newArray;
  };

  Serializer.prototype.resolve = function(variables, rootSObject, resolvable) {
    var query = this.getQuery();
    var resolvedVariable = resolvable.object.getVariable();

    // Write a with statement
    var withParts = this.removeVariable(variables, resolvedVariable);
    withParts.push({
      as: resolvedVariable,
      expr: this.resolvedExpr(resolvable)
    });

    query.with(withParts);

    // Replace in rootSObject at path with resolved
    rootSObject.replaceAtPath(resolvable.path, resolvedVariable);
  };

  Serializer.prototype.rootSObject = function(value) {
    if (_.isArray(value)) {
      return value[0];
    }
    else {
      return value;
    }
  };

  Serializer.prototype.findVariables = function(resolvables) {
    return _.map(resolvables, function(item) {
      return item.object.getVariable();
    });
  };

  Serializer.prototype.flattenVariables = function(variables) {
    return _.map(variables, function(item) {
      if (_.isString(item)) {
        return item;
      }
      else {
        return item.as;
      }
    });
  };

  Serializer.prototype.cleanUpVariables = function(variables, resolvable) {
    return _.difference(variables, _.values(resolvable.object.getPropsObject()));
  };

  Serializer.prototype.return = function(value, additionalParts) {
    var query = this.getQuery();
    var rootSObject = this.rootSObject(value);
    var resolvables = this.findResolvables(value);
    var variables = this.findVariables(resolvables);

    while (resolvables.length > 1) {
      var resolvable = resolvables[0];
      variables = this.cleanUpVariables(variables, resolvable);
      this.resolve(variables, rootSObject, resolvable);
      variables = this.flattenVariables(variables);
      resolvables = _.rest(resolvables);
    }

    _.each(additionalParts, function(part) {
      query.add(part);
    });

    query.return([this.resolvedExpr(resolvables[0])]);
  };

  return {
    Serializer: Serializer,
    SObject: SObject
  };
}());
