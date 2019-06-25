import Routable, { Route, POST, Path, GET, Query, Body, Authenticated, DELETE } from '../../Routable';
import * as IAuth from '../../../api/v1/auth';

import nanoid from 'nanoid';
import authenticator from 'otplib/authenticator';
import crypto from 'crypto';

authenticator.options = { crypto };

import { dbConn } from '../../../database';
import { User } from '../../../database/entity/user/User';
import { TwoFactor } from '../../../database/entity/imports';

export class Auth extends Routable {
	@Path('/api/v1')
	path;

	@Route('/auth/authenticate')
	@Body('email', 'password')
	@POST
	async Authenticate(req, res, email: string, password: string): Promise<IAuth.Authenticate | void> {
		let repo = dbConn.getRepository(User);
		let user = await repo.findOne({
			email,
			password
		}, {
			relations: ['options2FA']
		})
		
		if (!user) {
			res.status(403);
			res.send({ error: "Invalid email or password!" });

			return;
		}

		let twoFactor = user.options2FA;
		if (twoFactor.mode != 'none') {
			twoFactor.token = nanoid(24);
			await dbConn.manager.save(twoFactor);

			return {
				do2FA: true,
				token: twoFactor.token
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
	async Authenticate2FA(req, res, token: string, code: number): Promise<IAuth.Authenticate2FA | void> {
		let tfa = await dbConn.manager.findOne(TwoFactor, {
			where: {
				token
			}
		});

		if (!tfa) {
			res.status(403);
			res.send({ error: "Invalid 2FA token!" });

			return;
		}

		tfa.token = null;
		await dbConn.manager.save(tfa);

		if (tfa.mode == 'totp') {
			if (!authenticator.verify({secret: tfa.totpKey, token: code})) {
				res.status(403);
				res.send({ error: "Invalid TOTP code!" });

				return;
			}
		}

		//if (code != "test") {
		//	res.status(403);
		//	res.send({ error: "Invalid code!"});
//
//			return;
//		}

		let user = await dbConn.manager.findOne(User, {
			where: {
				options2FA: tfa
			}
		});

		return {
			username: user.username,
			accessToken: user.accessToken
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