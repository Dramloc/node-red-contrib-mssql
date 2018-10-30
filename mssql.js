const mustache = require('mustache');
const sql = require('mssql');

module.exports = (RED) => {
  function connection(config) {
    RED.nodes.createNode(this, config);

    const node = this;
    this.config = {
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

    this.connection = sql;
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
    this.query = config.query;
    this.connection = mssqlCN.connection;
    this.config = mssqlCN.config;
    this.outField = config.outField;

    const node = this;
    const b = node.outField.split('.');
    let i = 0;
    let r = null;
    let m = null;
    const rec = (obj) => {
      i += 1;
      if (i < b.length && typeof obj[b[i - 1]] === 'object') {
        rec(obj[b[i - 1]]); // not there yet - carry on digging
      } else if (i === b.length) {
        // we've finished so assign the value
        obj[b[i - 1]] = r;
        node.send(m);
        node.status({});
      } else {
        obj[b[i - 1]] = {}; // needs to be a new object so create it
        rec(obj[b[i - 1]]); // and carry on digging
      }
    };

    node.on('input', (msg) => {
      console.log(node.config);

      node.connection
        .connect(node.config)
        .then(() => {
          node.status({ fill: 'blue', shape: 'dot', text: 'requesting' });

          let query = mustache.render(node.query, msg);

          if (!query || query === '') {
            query = msg.payload;
          }

          const request = new node.connection.Request();

          request
            .query(query)
            .then((rows) => {
              i = 0;
              r = rows;
              m = msg;
              rec(msg);
            })
            .catch((err) => {
              node.error(err);
              node.status({ fill: 'red', shape: 'ring', text: 'Error' });
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
