import express from 'express';
import * as http from 'http';
import * as winston from 'winston';
import * as expressWinston from 'express-winston';
import cors from 'cors'
import {CommonRoutesConfig} from './http/common/common.routes.config';
import {PancakeSwapRoutesConfig} from './http/pancake-swap/pancake-swap.routes.config';
import debug from 'debug';
require('dotenv').config();

const app: express.Application = express();
const server: http.Server = http.createServer(app);
const port = 3000;
const routes: Array<CommonRoutesConfig> = [];
const debugLog: debug.IDebugger = debug('app');

app.use(express.json())
app.use(cors());

console.log('process.env.JSON_RPC_PROVIDER_POLYGON', process.env.JSON_RPC_PROVIDER_POLYGON);

const loggerOptions: expressWinston.LoggerOptions = {
  transports: [new winston.transports.Console()],
  format: winston.format.combine(
    winston.format.json(),
    winston.format.prettyPrint(),
    winston.format.colorize({ all: true })
  ),
};

if (!process.env.DEBUG) {
  loggerOptions.meta = false; // when not debugging, make terse
}

app.use(expressWinston.logger(loggerOptions));

routes.push(new PancakeSwapRoutesConfig(app, 'pancake-swap'));

const runningMessage = `Server running at http://localhost:${port}`;

app.get('/', (_req: express.Request, res: express.Response) => {
  res.status(200).send(runningMessage)
});

server.listen(port, () => {
  routes.forEach((route: CommonRoutesConfig) => {
    debugLog(`Routes configured for ${route.getName()}`);
  });
  console.log(runningMessage);
});
