import Routable, { Route, POST, Path, GET, Query, Body, Authenticated, DELETE } from '../../Routable';
import * as IAuth from '../../../api/v1/auth';

import { dbConn } from '../../../database';
import { User } from '../../../database/entity/auth/User';
import { Request, Router } from 'express';
import { TwoFactor } from '../../../database/entity/imports';

export class Auth extends Routable {
	@Path('/api/v1')
	path;

	@Route('/auth/authenticate')
	@Body('email', 'password')
	@POST
	async Authenticate(req, res, email: string, password: string): Promise<IAuth.Authenticate> {
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

	@Route('/auth/2fa')
	@Body('token', 'code')
	@POST
	async Authenticate2FA(req, res, token: string, code: string): Promise<IAuth.Authenticate2FA> {
		return {
			username: 'test',
			accessToken: 'test'
		};
	}

	@Route('/auth/token/verify')
	@Body('accessToken')
	@POST
	async VerifyToken(req, res, accessToken: string): Promise<IAuth.VerifyToken> {
		return {
			valid: false
		};
	}

	@Route('/auth/token')
	@Authenticated()
	@POST
	async RefreshToken(req, res, user): Promise<IAuth.RefreshToken> {
		return {
			accessToken: 't'
		};
	}

	@Route('/auth/token')
	@Authenticated()
	@DELETE
	async RemoveToken(req, res, user): Promise<IAuth.RemoveToken> {
		return {
			success: true
		};
	}

	@Route('/auth/create')
	@Body('email', 'password', 'username', 'redirectURI')
	@POST
	async UserCreation(req, res, email: string, password: string, username: string, redirectURI: string): Promise<IAuth.UserCreation> {
		return {
			accessToken: 't'
		};
	}

	@Route('/auth/verify')
	@Query('code')
	@GET
	async EmailVerify(req, res, code: string): Promise<void> {
		let target = <IAuth.EmailVerify> {
			redirectsTo: 'https://riotchat.gq/verified'
		};

		res.redirect(target.redirectsTo);
	}
}