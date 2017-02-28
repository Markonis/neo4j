var neo4j = require('neo4j-driver').v1;
var _ = require('underscore');
var Options = require('@markonis/options');

module.exports = (function() {

  function Neo4j(params) {
    var options = new Options(params, {
      url: process.env['DATABASE_URL'],
      user: process.env['DATABASE_USERNAME'],
      password: process.env['DATABASE_PASSWORD']
    });

    var url = options.get('url');
    var user = options.get('user');
    var pass = options.get('password');
    var driver = null;
    var session = null;

    this.getDriver = function() {
      if (driver == null) {
        driver = neo4j.driver(url, neo4j.auth.basic(user, pass));
      }
      return driver;
    };

    this.getSession = function() {
      if (session == null) {
        session = this.getDriver().session();
      }
      return session;
    };
  }

  Neo4j.prototype.run = function(cypher, params) {
    var self = this;
    return self.getSession()
      .run(cypher, params)
      .then(self.convertNumbers);
  };

  Neo4j.prototype.close = function() {
    var driver = this.getDriver();
    var session = this.getSession();
    if (session != null) session.close();
    if (driver != null) driver.close();
  };

  Neo4j.prototype.convertNumbers = function(rawResult) {
    function convertValue(value) {
      if (neo4j.isInt(value)) {
        return value.toNumber();
      }
      else if (_.isArray(value)) {
        return convertArray(value);
      }
      else if (_.isObject(value)) {
        return convertObject(value);
      }
      else {
        return value;
      }
    }

    function convertObject(object) {
      return _.mapObject(object, convertValue);
    }

    function convertArray(array) {
      return _.map(array, convertValue);
    }

    var result = rawResult;

    if (result && result.records.length > 0) {
      result.records = _.map(result.records, function(record) {
        record._fields = convertArray(record._fields);
        return record;
      });
    }

    return result;
  };

  return Neo4j;
}());
