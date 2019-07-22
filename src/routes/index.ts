import { Router, json, urlencoded } from 'express';
import cors from 'cors';
import { execSync } from 'child_process';

import { dbConn } from '../database';

const router = Router();
export default router;

router.use(cors());
router.use(urlencoded({ extended: true }));
router.use(json());

router.get('/', (req, res) => {
	res.contentType('application/json');
	res.send({
		api: 'RIOT',
		node: 'local',
		version: execSync('git rev-parse HEAD').toString().trim()
	});
});

router.use((req, res, next) => {
	if (!dbConn) {
		res.status(500);
		res.send({ error: 'Waiting for database.' });
		return;
	}

	next();
});

import './api/v1/auth';
import './api/v1/channels';
import './api/v1/users';