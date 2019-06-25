import Routable, { Route, POST, Path, GET, Query, Body, Authenticated, DELETE } from '../../Routable';
import * as IAuth from '../../../api/v1/auth';

import nanoid from 'nanoid';
import authenticator from 'otplib/authenticator';
import crypto from 'crypto';

authenticator.options = { crypto };

import { dbConn } from '../../../database';
import { User } from '../../../database/entity/user/User';
import { TwoFactor, UserProfile } from '../../../database/entity/imports';
import { hash, compare } from 'bcrypt';

export class Auth extends Routable {
	@Path('/api/v1/auth')
	path;

	@Route('/authenticate')
	@Body('email', 'password')
	@POST
	async Authenticate(req, res, email: string, password: string): Promise<IAuth.Authenticate | void> {
		let repo = dbConn.getRepository(User);
		let user = await repo.findOne({
			email
		}, {
			relations: ['options2FA']
		})
		
		if (!user) {
			res.status(403);
			res.send({ error: "Invalid email!" });

			return;
		}

		let valid = await compare(password, user.password);

		if (!valid) {
			res.status(403);
			res.send({ error: "Invalid password!" });

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

	@Route('/2fa')
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

	@Route('/create')
	@Body([true, true, true, false], 'email', 'password', 'username', 'redirectURI')
	@POST
	async UserCreation(req, res, email: string, password: string, username: string, redirectURI: string): Promise<IAuth.UserCreation | void> {
		let existing = await dbConn.manager.findOne(User, {
			where: {
				email
			}
		});

		if (existing) {
			res.status(409);
			res.send({ error: "Email already in use!" });

			return;
		}

		let userProfile = new UserProfile();
		userProfile.status = 'offline';
		await dbConn.manager.save(userProfile);

		let tfa = new TwoFactor();
		tfa.mode = 'none';
		await dbConn.manager.save(tfa);

		let user = new User();
		user.email = email;
		user.password = await hash(password, 10);
		user.username = username;
		user.accessToken = nanoid(64);
		user.userProfile = userProfile;
		user.options2FA = tfa;
		await dbConn.manager.save(user);

		if (redirectURI) {
			res.redirect(redirectURI);
			return;
		}

		return {
			accessToken: user.accessToken
		};
	}

	/*@Route('/auth/verify')
	@Query('code')
	@GET
	async EmailVerify(req, res, code: string): Promise<void> {
		let target = <IAuth.EmailVerify> {
			redirectsTo: 'https://riotchat.gq/verified'
		};

		res.redirect(target.redirectsTo);
	}*/
}