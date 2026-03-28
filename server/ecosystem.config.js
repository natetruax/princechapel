module.exports = {
  apps: [{
    name: 'princechapel',
    script: 'index.js',
    cwd: '/var/www/princechapel/server',
    env: { NODE_ENV: 'production' },
    restart_delay: 3000,
    max_restarts: 10
  }]
};
