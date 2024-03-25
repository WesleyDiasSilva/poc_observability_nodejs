import express from "express";
import promClient from "prom-client";
const app = express();

const register = new promClient.Registry();

const httpRequestCounter = new promClient.Counter({
  name: "node_app_http_requests_total",
  help: "Total HTTP requests received",
  labelNames: ["method", "path", "status", "body"],
});

const httpRequestDurationHistogram = new promClient.Histogram({
  name: "node_app_http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "path", "status"],
  buckets: [0.1, 0.5, 1, 1.5, 2, 2.5, 3, 4],
});

const onlineUsers = new promClient.Gauge({
  name: "node_app_online_users",
  help: "Number of online users",
  labelNames: ["path", "status"],
});

register.registerMetric(httpRequestCounter);
register.registerMetric(httpRequestDurationHistogram);
register.registerMetric(onlineUsers);

app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    httpRequestCounter.inc({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      body: JSON.stringify(req.body),
    });
    httpRequestDurationHistogram.observe(
      { path: req.path, status: res.statusCode },
      duration / 1000
    );
    onlineUsers.set(
      {
        path: req.path,
        status: res.statusCode,
      },
      Math.floor(Math.random() * 100)
    );
  });
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.get("/user", (req, res) => {
  const randomNumber = Math.floor(Math.random() * 100);
  const randomTime = Math.floor(Math.random() * 5);
  const users: any = [];
  setTimeout(() => {
    for (let i = 0; i < randomNumber; i++) {
      users.push({
        id: i,
        name: `User ${i}`,
      });
    }
    res.json({ users });
  }, randomTime);
});

app.get("report", (req, res) => {
  console.log("Grafana reportou!");
  res.send("Grafana reportou!");
});

app.get("/metrics", async (req, res) => {
  const randomNumber = Math.floor(Math.random() * 100);
  console.log("Prometheus metrics called: ", randomNumber);
  const metrics = await register.metrics();
  res.set("Content-Type", register.contentType);
  res.end(metrics);
});

export default app;
