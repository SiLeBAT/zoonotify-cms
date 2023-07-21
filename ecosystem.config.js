module.exports = {
    apps: [
      {
        name: 'zoonotify-cms',
        script: 'npm',
        args: 'start',
        env: {
            NODE_ENV: "production",
          }
      },
    ],
  };
