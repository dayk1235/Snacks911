export function getPersistenceMode() {
  return process.env.MONGODB_URI ? 'mongo' : 'local';
}

export function getMongoConfig() {
  return {
    uri: process.env.MONGODB_URI || '',
    dbName: process.env.MONGODB_DB || 'snacks911',
  };
}
