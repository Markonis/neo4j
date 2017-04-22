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

  function propsArrayToObject(attrs) {
    return _.chain(attrs).map(function(name) {
      return [name, 'node.' + name];
    }).object().value();
  }

  function objectToParams(obj) {
    return _.mapObject(obj, function(value, key) {
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
    var filterObj = objectToParams(filter);
    var propsObj = propsArrayToObject(props);

    return this.runCypher(filter, function(q) {
      q.match([q.node('node' + label, filterObj)]);
      q.return([q.json(propsObj)]);
    });
  };

  service.createNode = function(label, params) {
    var options = new Options(params, {
      props: ['uuid'],
      attrs: {}
    });

    var props = options.get('props');
    var attrs = options.get('attrs');
    var paramsObject = objectToParams(attrs);
    var propsObj = propsArrayToObject(props);

    return this.runCypher(attrs, function(q) {
      q.create([q.node('node' + label, paramsObject)]);
      q.return([q.json(propsObj)]);
    });
  };

  service.findOrCreateNode = function(label, params) {
    var self = this;

    function find() {
      return self.findNode(label, {
        props: params.props,
        filter: params.attrs
      });
    }

    function create() {
      return self.createNode(label, params);
    }

    return find().then(function(result) {
      return result ? result : create();
    });
  };

  service.updateNode = function(label, params) {
    var options = new Options(params, {
      uuid: null,
      attrs: null,
      props: ['uuid']
    });

    var uuid = options.get('uuid');
    var props = options.get('props');
    var attrs = options.get('attrs');

    attrs.uuid = uuid;
    var attrsObj = objectToParams(attrs);
    var propsObj = propsArrayToObject(props);

    return this.runCypher(attrs, function(q) {
      q.match([
        q.node('node' + label, {
          uuid: '{uuid}'
        })
      ]);

      q.set('node', attrsObj);
      q.return([q.json(propsObj)]);
    });
  };

  service.deleteNode = function(label, params) {
    var options = new Options(params, {
      uuid: null
    });

    return this.runCypher(params, function(q) {
      q.match([
        q.node('node' + label, {
          uuid: '{uuid}'
        })
      ]);

      q.optionalMatch([
        q.existingNode('node'),
        q.relation('relation'),
        q.node('')
      ]);

      q.with([
        'node',
        'node.uuid as uuid',
        'relation'
      ]);

      q.add('DELETE relation, node');

      q.return([
        q.json({
          uuid: 'uuid'
        })
      ]);
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
