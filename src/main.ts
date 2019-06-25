import express from 'express';

import Logger from './system/logging';
import router from './routes';
import './database';

Logger.log(`Currently running RIOT version 1.0.0`);

const app = express();
app.use(router);

app.listen(25565, () => {
	Logger.info(`RIOT listening on :25565`);
});