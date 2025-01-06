const { getDataConnect, validateArgs } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'default',
  service: 'expense-tracker',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;

