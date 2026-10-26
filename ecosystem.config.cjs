module.exports = {
  apps: [
    {
      name: 'sellvro',
      script: './app.cjs',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
  ],
}
