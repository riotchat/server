import express from 'express';

import Logger from './system/logging';
import { createServer } from 'http';

Logger.log(`Currently running RIOT version 1.0.0`);

const app = express();
const http = createServer(app);
http.listen(3000, () => {
	Logger.info(`RIOT listening on :3000`);
});

export default http;

import router from './routes';
app.use(router);

import './database';
import './websocket';