import app from "./app.js";
import config from "./config/index.js";

import * as connection from "./connection/index.js";

import { application } from "./application-info/index.js";

const logger = application(null, `API Server`);

let listeningCb;

const apiServer = app.listen(config.port, () => {
  logger.info(`App is on '${config.env}' mode`);
  logger.info(
    `Listening to port ${config.port} - http://localhost:${config.port}/v1/docs`
  );
  listeningCb(true);
});

apiServer.ready = (async () => {
  await new Promise(r => {
    listeningCb = r;
  });
  if (config.connections) {
    logger.info(
      `connections option was set to [${config.connections.join(
        `, `
      )}], initializing these`
    );
  }
  await connection.openConnections(config.connections);
  return true;
})();

let staticServer;

process.on(`SIGTERM`, async (code = 0) => {
  try {
    const sc = staticServer?.close;

    const funcs = [() => apiServer.close(), sc ? () => sc() : null];

    const promises = [];
    for (const f of funcs) {
      if (f) {
        let p = f();
        promises.push(p);
      }
    }
    await Promise.all(promises);
    logger.info(`released resources`);
    process.exit(code);
  } catch {
    // do nothing. let the app crash
  }
});

export { apiServer };
