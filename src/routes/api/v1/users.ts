import Routable, { Route, POST, Path, GET, Query, Body, Authenticated, DELETE, Param } from '../../Routable';
import * as IUser from '../../../api/v1/users';
import { dbConn } from '../../../database';
import { UserProfile, User, DMChannel } from '../../../database/entity/imports';
import { Auth } from './auth';

export class Users extends Routable {
	@Path('/api/v1/users')
	path;

	@Route('/:user')
	@Authenticated()
	@Param('user')
	@GET
	async Users(req, res, user, target: string): Promise<IUser.User | void> {
		if (target !== "@me") {
			user = await dbConn.manager.findOne(User, {
				where: {
					id: target
				}
			});

			if (!user) {
				res.status(404);
				res.send({ error: "Cannot find user!" });

				return;
			}
		}

		let profile = await dbConn.manager.findOne(UserProfile, {
			where: {
				user
			}
		});

		return {
			status: profile.status
		};
	}

	@Route('/@me/channels')
	@Authenticated()
	@GET
	async GetDMs(req, res, user: User): Promise<IUser.GetDMs> {
		let channels = await dbConn.manager.find(DMChannel, {
			where: [
				{
					userA: user
				},
				{
					userB: user
				}
			]
		});

		let dms: IUser.GetDMs = [];
		channels.forEach(channel =>
			dms.push({
				id: channel.id,
				user: user.id === channel.userA.id ?
					channel.userB.id : channel.userA.id
			})
		);

		return dms;
	}

	@Route('/@me/channels')
	@Authenticated()
	@Body('recipient')
	@POST
	async CreateDM(req, res, user: User, recipient: string): Promise<IUser.CreateDM | void> {
		let recp = await dbConn.manager.findOne(User, {
			where: {
				id: recipient
			}
		});

		if (!recp) {
			res.status(404);
			res.send('Unknown user.');

			return;
		}

		let channel = await dbConn.manager.findOne(DMChannel, {
			where: [
				{
					userA: user,
					userB: recp
				},
				{
					userA: recp,
					userB: user
				}
			]
		});

		if (!channel) {
			channel = new DMChannel();
			channel.userA = user;
			channel.userB = recp;
			await dbConn.manager.save(channel);
		}

		return {
			id: channel.id
		};
	}
}