var _ = require('underscore');
var Session = require('./session.js');

module.exports = (function() {
  var Schema = function(configuration) {
    var configuration = configuration;
    this.getConfiguration = function() {
      return configuration;
    };
  };

  function nodeQueries(subSchema, label) {
    return _.chain(subSchema)
      .map(function(value, key) {
        var result = [];

        if (value.index && !value.unique)
          result.push('CREATE INDEX ON ' + label + '(' + key + ')');

        if (value.unique)
          result.push('CREATE CONSTRAINT ON (node' + label + ') ASSERT node.' + key + ' IS UNIQUE');

        return result;
      })
      .values()
      .flatten()
      .value();
  }

  Schema.prototype.setup = function() {
    var configuration = this.getConfiguration();
    var session = new Session();

    var allQueries = _.chain(configuration)
      .map(nodeQueries).values().flatten().value();

    _.each(allQueries, function(query) {
      console.log(query);
    });

    var allPromises = _.map(allQueries, function(query) {
      return session.run(query);
    });

    Promise.all(allPromises)
      .catch(function(error) {
        console.log(error);
      })
      .then(function() {
        session.close();
      });
  };

  return Schema;
}());
