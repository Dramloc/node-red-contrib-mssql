const mustache = require('mustache');
const sql = require('mssql');
const set = require('lodash/set');

module.exports = (RED) => {
  function connection(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.config = {
      user: node.credentials.username,
      password: node.credentials.password,
      domain: node.credentials.domain,
      server: config.server,
      database: config.database,
      options: {
        encrypt: config.encyption,
        useUTC: config.useUTC,
      },
    };
    node.connection = sql;
  }

  RED.nodes.registerType('MSSQL-CN', connection, {
    credentials: {
      username: { type: 'text' },
      password: { type: 'password' },
      domain: { type: 'text' },
    },
  });

  function mssql(config) {
    RED.nodes.createNode(this, config);
    const mssqlCN = RED.nodes.getNode(config.mssqlCN);
    const node = this;
    node.query = config.query;
    node.connection = mssqlCN.connection;
    node.config = mssqlCN.config;
    node.outField = config.outField;

    node.on('input', (msg) => {
      node.connection
        .connect(node.config)
        .then(() => {
          node.status({ fill: 'blue', shape: 'dot', text: 'requesting' });

          const query = mustache.render(node.query, msg) || msg.payload;
          const request = new node.connection.Request();

          return request.query(query).then((rows) => {
            set(msg, node.outField, rows);
            node.send(msg);
            node.status({});
          });
        })
        .catch((err) => {
          node.error(err);
          node.status({ fill: 'red', shape: 'ring', text: 'Error' });
        });
    });
  }
  RED.nodes.registerType('MSSQL', mssql);
};
