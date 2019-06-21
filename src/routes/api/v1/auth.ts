import Routable, { Route, POST, Path, GET, Query, Body } from '../../Routable';
import * as IAuth from '../../../api/v1/auth';

import { dbConn } from '../../../database';
import { User } from '../../../database/entity/auth/User';
import { Request } from 'express';
import { TwoFactor } from '../../../database/entity/imports';

export class Auth extends Routable {
	@Path('/api/v1')
	path;

	@Route('/auth/authenticate')
	@Body('email', 'password')
	@POST
	async Authenticate(req: Request, res, email: string, password: string): Promise<IAuth.Authenticate> {
		let user = await dbConn.manager.findOne(User, {
			where: {
				email,
				password
			}
		});

		let twoFactor = await dbConn.manager.findOne(TwoFactor, {
			where: {
				user
			}
		});

		if (twoFactor.mode != 'none') {
			return {
				do2FA: true,
				token: '2fa token thing'
			}
		}

		return {
			do2FA: false,
			username: user.username,
			accessToken: user.accessToken
		};
	}
}