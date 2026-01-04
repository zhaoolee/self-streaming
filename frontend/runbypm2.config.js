module.exports = {
  apps: [
    {
      name: 'self-streaming-frontend',
      script: 'pnpm',
      args: 'start',
      cwd: '/Users/zhaoolee/github/self-streaming/frontend',
      env: {
        NODE_ENV: 'production',
        PORT: 38082
      },
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
}
