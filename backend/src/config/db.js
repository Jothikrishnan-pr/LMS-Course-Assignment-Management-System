const dns = require('dns');
const mongoose = require('mongoose');
const { mongoUri } = require('./env');

// Optional: override DNS servers (fixes querySrv ECONNREFUSED on some networks)
if (process.env.DNS_SERVERS) {
  dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
}

module.exports = async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri);
  console.log('MongoDB connected');
};