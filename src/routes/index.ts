import { Router, json, urlencoded } from 'express';
import { dbConn } from '../database';

const router = Router();
export default router;

router.use((req, res, next) => {
	if (!dbConn) {
		res.status(500);
		res.send({ error: 'Waiting for database.' });
		return;
	}

	next();
});

router.use(urlencoded({ extended: true }));
router.use(json());

import './api/v1/auth';
import './api/v1/channels';
import './api/v1/users';