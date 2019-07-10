import Routable, { Route, POST, Path, GET, Body, Authenticated, Param, DELETE, PUT, Query } from '../../Routable';
import * as IChannel from '../../../api/v1/channels';
import * as IUser from '../../../api/v1/users';
import { dbConn } from '../../../database';
import { User, DMChannel, Group } from '../../../database/entity/imports';
import { Friend } from '../../../database/entity/user/Friend';
import { createQueryBuilder, getRepository, Brackets, getManager } from 'typeorm';
import { SendPacket } from '../../../websocket';
import { ChannelType } from '../../../api/v1/channels';

function GenerateProfilePicture(id: string) {
	let arr = id.split("");
	let no = 0;

	for (let i in arr) no += arr[i].charCodeAt(0);

	return `https://raw.githubusercontent.com/riotchat/assets/master/default/${no % 5}.png`;
}

export class Users extends Routable {
	@Path('/api/v1/users')
	path;

	@Route('/:user')
	@Authenticated(['userProfile'])
	@Param('user')
	@GET
	async Users(req, res, user: User, target: string): Promise<IUser.User | void> {
		let authenticatedUserId = user.id;

		let self = target === '@me' || target === user.id;
		if (!self) {
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

		let friend = await createQueryBuilder(Friend)
			.where('Friend.userId = :user', { user: authenticatedUserId })
			.andWhere('Friend.friendId = :target', { target: user.id })
			.getOne();

		let profile = user.userProfile;
		return {
			id: user.id,
			email: self ? user.email : undefined,
			createdAt: +user.createdAt,
			username: user.username,

			status: profile.status,
			avatarURL: profile.avatarURL || GenerateProfilePicture(user.id),

			relation: self ? 'self' : (friend ? friend.status : 'unknown')
		};
	}

	@Route('/@me')
	@Authenticated(['userProfile'])
	@Body([false, false, false, false], 'username', 'email', 'status', 'avatarURL')
	@PUT
	async UpdateProfile(req, res, user: User,
		username: string, email: string, status: IUser.Status, avatarURL: string): Promise<IUser.UpdateUser> {
		
		if (username) {
			user.username = username;
		}

		if (email) {
			user.email = email;
		}

		let profile = user.userProfile;

		if (status) {
			if (status !== 'offline') {
				profile.status = status;
			}
		}

		if (avatarURL) {
			profile.avatarURL = avatarURL;
		}

		await dbConn.manager.save([ user, profile ]);

		SendPacket({
			type: 'userUpdate',
			user: user.id,

			status: profile.status,
			avatarURL: profile.avatarURL
		});

		return user.toIUser('self', true);
	}

	@Route('/@me/channels')
	@Authenticated()
	@Query([false], 'sync')
	@GET
	async GetDMs(req, res, user: User, sync: 'true' | undefined): Promise<IUser.GetDMs> {
		let channels = await createQueryBuilder(DMChannel, 'Channel')
			.where('(Channel.userA = :id OR Channel.userB = :id)', { id: user.id })
			.andWhere('Channel.active = 1')
			.getRawMany();

		return channels.map(channel => {
			if (sync === 'true') {
				return {
					id: channel.Channel_id,
					type: ChannelType.DM,

					users: [
						channel.Channel_userAId,
						channel.Channel_userBId
					]
				} as IChannel.Channel;
			}

			return channel.Channel_id;
		});
	}

	@Route('/@me/groups/:id')
	@Authenticated()
	@Param('id')
	@GET
	async Group(req, res, user: User, id: string): Promise<IUser.Group | void> {
		let query = await createQueryBuilder(Group)
			.where('Group.id = :id', { id })
			.leftJoinAndSelect('Group.channel', 'channel')
			.getRawAndEntities();
		
		let group = query.entities[0];
		if (!group) {
			res.status(404);
			res.send({ error: 'Group does not exist!' });

			return;
		}

		let members = (await getManager()
			.query('SELECT usersId FROM `groups -> members` WHERE groupsId = ?', [ id ]))
			.map(m => { return m.usersId });

		let raw = query.raw[0];
		return {
			id: group.id,
			createdAt: +group.createdAt,
			title: group.title,
			avatarURL: group.avatarURL,

			owner: raw.Group_ownerId,
			members,

			channel: {
				id: group.channel.id,
				type: ChannelType.GROUP,
				group: group.id,
				description: group.channel.description
			}
		};
	}

	@Route('/@me/groups')
	@Authenticated()
	@Query([false], 'sync')
	@GET
	async GetGroups(req, res, user: User, sync: 'true' | undefined): Promise<IUser.GetGroups> {
		let users = await dbConn.query("SELECT groupsId FROM `groups -> members` WHERE usersId = ?", [user.id]);

		if (sync !== 'true')
			return users.map(u => { return u.groupsId; });
	
		if (users.length < 1)
			return [];

		let qb = createQueryBuilder(Group), ids = [];
		users.forEach((x, i) => {
			ids.push(x.groupsId);
			qb = qb
				.orWhere(`Group.id = :${i}`)
				.setParameter(i.toString(), x.groupsId)
		});

		let groups = await qb
			.innerJoinAndSelect('Group.channel', 'channel')
			//.innerJoinAndSelect('Group.members', 'member')
			.getRawMany();

		/*let members = {};
		for (let i=0;i<groups.length;i++) {
			let group = groups[i];
			let id = group.Group_id;
			if (!members[id]) {
				members[id] = [];
			}

			members[id].push(group.member_id);
		}

		let map = new Map();
		groups.forEach(x => map.set(x.Group_id, x));
		let gr = Array.from(map.values());*/

		let sql = 'SELECT * FROM `groups -> members` WHERE groupsId = ?' + ' OR groupsId = ?'.repeat(ids.length - 1);
		let all_users = await dbConn.query(sql, ids);

		let grps: IUser.GetGroups = [];
		for (let i=0;i<groups.length;i++) {
			let group = groups[i];

			let members = all_users
				.filter(x => x.groupsId == group.Group_id)
				.map(x => { return x.usersId });

			grps.push({
				id: group.Group_id,
				createdAt: +group.Group_createdAt,
				avatarURL: group.Group_avatarURL,
				title: group.Group_title,

				owner: group.Group_ownerId,
				members: members,

				channel: {
					id: group.channel_id,
					type: ChannelType.GROUP,
					group: group.Group_id,
					description: group.channel_description
				}
			});
		}

		return grps;
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
	@Query([false], 'sync')
	@GET
	async GetFriends(req, res, user: User, sync: 'true' | undefined): Promise<IUser.Friends> {
		let friends = await createQueryBuilder(Friend)
			.where('Friend.userId = :target', { target: user.id })
			.getRawMany();
		
		let out: IUser.Friends = [];
		if (sync === 'true') {
			let qb = createQueryBuilder(User), status = {};
			friends.forEach((x, i) => { 
				status[x.Friend_friendId] = x.Friend_status;
				qb = qb
					.orWhere(`User.id = :${i}`)
					.setParameter(i.toString(), x.Friend_friendId)
			});

			let users = await qb
				.select([ 'User.id', 'User.createdAt', 'User.username' ])
				.innerJoinAndSelect('User.userProfile', 'userProfile')
				.getMany();

			users.forEach(x =>
				out.push({
					id: x.id,
					username: x.username,
					createdAt: +x.createdAt,

					status: x.userProfile.status,
					avatarURL: x.userProfile.avatarURL || GenerateProfilePicture(x.id),

					relation: status[x.id]
				})
			);
		} else {
			for (let i=0;i<friends.length;i++) {
				let friend = friends[i];
				out.push({
					user: friend.Friend_friendId,
					type: friend.Friend_status
				});
			}
		}

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
						user: friend,
						friend: user
					}
				});
	
				other.status = 'active';
				await dbConn.manager.save([entry, other]);

				SendPacket({
					type: 'userUpdate',
					user: user.id,
		
					relation: 'active'
				}, ws => ws.user.id === friend.id);

				SendPacket({
					type: 'userUpdate',
					user: friend.id,
		
					relation: 'active'
				}, ws => ws.user.id === user.id);
	
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
		}, ws => ws.user.id === friend.id);

		SendPacket({
			type: 'userUpdate',
			user: friend.id,

			relation: 'pending'
		}, ws => ws.user.id === user.id);

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

		SendPacket({
			type: 'userUpdate',
			user: friend.id,

			relation: 'unknown'
		}, ws => ws.user.id === user.id);

		return {
			status: 'unknown'
		};
	}

}