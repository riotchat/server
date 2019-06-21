import "reflect-metadata";
import { createConnection, Connection } from 'typeorm';
import Logger from '../system/logging';

import * as Entities from './entity/imports';
import { TwoFactor, User } from './entity/imports';
const entities = [];
for (let key in Entities) entities.push((<any> Entities)[key]);

export var dbConn: Connection;

createConnection({
	type: 'mysql',
	/** you will only connect if you have been authorised */
	host: 'insrt.uk', //'192.168.0.26',
	port: 33306, //3306,
	username: 'riot',
	password: 'riot',
	database: 'riot',
	entities,
	synchronize: true,
	logging: false
}).then(async connection => {
	dbConn = connection;
	Logger.success('Connected to database!');
}).catch(error => {
	Logger.error(`Could not connect to database! ${error}`);
});