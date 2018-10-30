const mustache = require("mustache");
const sql = require("mssql");
const set = require("lodash/set");

module.exports = RED => {
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
        useUTC: config.useUTC
      }
    };
  }

  RED.nodes.registerType("MSSQL-CN", connection, {
    credentials: {
      username: { type: "text" },
      password: { type: "password" },
      domain: { type: "text" }
    }
  });

  function mssql(config) {
    RED.nodes.createNode(this, config);
    const mssqlCN = RED.nodes.getNode(config.mssqlCN);
    const node = this;
    node.query = config.query;
    node.config = mssqlCN.config;
    node.outField = config.outField;

    node.on("input", async msg => {
      try {
        const connection = await sql.connect(node.config);
        node.status({ fill: "blue", shape: "dot", text: "requesting" });
        const query = mustache.render(node.query, msg) || msg.payload;
        const result = await connection.request().query(query);
        set(msg, node.outField, result);
        node.send(msg);
        node.status({});
      } catch (err) {
        node.error(err);
        node.status({ fill: "red", shape: "ring", text: "Error" });
      } finally {
        await sql.close();
      }
    });
  }
  RED.nodes.registerType("MSSQL", mssql);
};
