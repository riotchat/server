import Routable, { Route, POST, Path, GET, Body, Authenticated, Param, DELETE } from '../../Routable';
import * as IUser from '../../../api/v1/users';
import { dbConn } from '../../../database';
import { User, DMChannel } from '../../../database/entity/imports';
import { Friend } from '../../../database/entity/user/Friend';
import { createQueryBuilder } from 'typeorm';
import { SendPacket } from '../../../websocket';

export class Users extends Routable {
	@Path('/api/v1/users')
	path;

	@Route('/:user')
	@Authenticated(['userProfile'])
	@Param('user')
	@GET
	async Users(req, res, user: User, target: string): Promise<IUser.User | void> {
		if (target !== "@me") {
			let repo = dbConn.getRepository(User);
			user = await repo.findOne({
				id: target
			}, {
				relations: ['userProfile']
			});

			if (!user) {
				res.status(404);
				res.send({ error: "Cannot find user!" });

				return;
			}
		}

		let profile = user.userProfile;
		return {
			id: user.id,
			username: user.username,
			status: profile.status,
			avatarURL: profile.avatarURL
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

	@Route('/@me/friends')
	@Authenticated()
	@GET
	async GetFriends(req, res, user: User): Promise<IUser.Friends> {
		let friends = await createQueryBuilder(Friend)
			.where('Friend.userId = :target', { target: user.id })
			.getRawMany();

		let out = [];
		friends.forEach(friend => {
			out.push({
				user: friend.Friend_friendId,
				type: friend.Friend_status
			});
		});

		return out;
	}

	@Route('/@me/friends/:id')
	@Authenticated()
	@Param('id')
	@POST
	async AddFriend(req, res, user: User, id: string): Promise<IUser.AddFriend | void> {
		let friend = await dbConn.manager.findOne(User, {
			where: {
				id
			}
		});

		if (!friend) {
			res.status(404);
			res.send({ error: 'User not found!' });
			
			return;
		}

		if (user.id === friend.id) {
			res.status(503);
			res.send({ error: 'Cannot add yourself!' });

			return;
		}

		let entry = await dbConn.manager.findOne(Friend, {
			where: {
				user,
				friend
			}
		});

		if (entry) {
			if (entry.status === 'incoming') {
				entry.status = 'active';
	
				let other = await dbConn.manager.findOne(Friend, {
					where: {
						friend: entry.user,
						user: entry.friend
					}
				});
	
				other.status = 'active';
				await dbConn.manager.save([entry, other]);

				SendPacket({
					type: 'userUpdate',
					user: user.id,
		
					relation: 'active'
				}, ws => ws.user.id === other.user.id);
	
				return {
					status: 'active'
				};
			}

			res.status(503);
			res.send({ error: 'Already friends or pending!' });

			return;
		}

		let self = new Friend();
		let other = new Friend();

		self.friend = friend;
		other.friend = user;

		self.status = 'pending';
		other.status = 'incoming';

		self.user = user;
		other.user = friend;

		await dbConn.manager.save([self, other]);

		SendPacket({
			type: 'userUpdate',
			user: user.id,

			relation: 'incoming'
		}, ws => ws.user.id === other.user.id);

		return {
			status: 'pending'
		};
	}

	@Route('/@me/friends/:id')
	@Authenticated()
	@Param('id')
	@DELETE
	async RemoveFriend(req, res, user: User, id: string): Promise<IUser.RemoveFriend | void> {
		let friend = await dbConn.manager.findOne(User, { where: { id } });

		if (!friend) {
			res.status(404);
			res.send('Cannot find user!');
			
			return;
		}

		let self = await dbConn.manager.findOne(Friend, { where: { user, friend } });

		if (!self) {
			res.status(404);
			res.send('Not friends with this user and not pending request!');

			return;
		}

		let other = await dbConn.manager.findOne(Friend, { where: { friend: user, user: friend } });
		await dbConn.manager.delete(Friend, [self, other]);

		SendPacket({
			type: 'userUpdate',
			user: user.id,

			relation: 'unknown'
		}, ws => ws.user.id === friend.id);

		return {
			status: 'unknown'
		};
	}

}