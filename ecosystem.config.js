module.exports = {
    apps: [
      {
        name: 'zoonotify-cms',
        script: 'npm',
        args: 'start',
        interpreter:'node@20.19.5',
        env: {
            NODE_ENV: "production",
          }
      },
    ],
  };
