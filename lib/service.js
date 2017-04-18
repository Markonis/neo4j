var Session = require('./session.js');
var cypherBuilder = require('./cypher-builder.js');
var Options = require('@markonis/options');
var _ = require('underscore');

module.exports = (function() {
  var session = null;
  var service = {};

  service.getSession = function() {
    if (_.isNull(session))
      session = new Session();
    return session;
  };

  service.setSession = function(newSession) {
    session = newSession;
  };

  function propsToObject(attrs) {
    return _.chain(attrs).map(function(name) {
      return [name, 'node.' + name];
    }).object().value();
  }

  function filterToObject(filter) {
    return _.mapObject(filter, function(value, key) {
      return '{' + key + '}';
    });
  }

  service.findNode = function(label, params) {
    var options = new Options(params, {
      filter: {},
      props: ['uuid']
    });

    var props = options.get('props');
    var filter = options.get('filter');
    var filterObj = filterToObject(filter);
    var propsObj = propsToObject(props);

    return this.runCypher(filter, function(q) {
      q.match([q.node('node' + label, filterObj)]);
      q.return([q.json(propsObj)]);
    });
  };

  service.runCypher = function(params, builder) {
    var session = this.getSession();
    var cypher = cypherBuilder.build(builder, params);

    return session.run(cypher, params).then(function(rawResult) {
      var result = null;
      if (rawResult.records.length > 0)
        result = rawResult.records[0]._fields[0];
      return result;
    });
  };

  return service;
}());
