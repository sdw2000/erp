module.exports = {
  apps : [
    {
      name: "MES-Backend",
      script: "java",
      args: "-jar target/MES-RECOVERED.jar",
      cwd: "E:\\java\\MES",
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "ERP-Frontend",
      script: "cmd.exe",
      args: "/c run-dev.bat",
      cwd: "E:\\vue\\ERP",
      watch: false,
      autorestart: true,
      max_memory_restart: '1G'
    }
  ]
}
