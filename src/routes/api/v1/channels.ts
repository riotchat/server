import Routable, { Route, POST, Path, GET, Query, Body, Authenticated, DELETE, Param } from '../../Routable';
import * as IChannels from '../../../api/v1/api/channels';
import { dbConn } from '../../../database';
import { Channel, Message, DMChannel, User, GroupChannel, Group, GuildChannel } from '../../../database/entity/imports';
import { createQueryBuilder, getConnection, getRepository, getManager, QueryBuilder } from 'typeorm';
import { SendPacket } from '../../../websocket';

export class Channels extends Routable {
	@Path('/api/v1/channels')
	path;

	@Route('/:id')
	@Authenticated()
	@Param('id')
	@GET
	async Channel(req, res, user: User, id: string): Promise<IChannels.Channel | void> {
		let channel = await getManager().findOne(Channel, { id });

		if (channel instanceof DMChannel) {
			return {
				id: channel.id,
				type: IChannels.ChannelType.DM,
				users: [
					channel.userA.id,
					channel.userB.id
				]
			};
		} else if (channel instanceof GroupChannel) {
			let group = await createQueryBuilder(Group)
				.where('Group.channelId = :id', { id })
				.select('Group.id')
				.getOne();

			return {
				id: channel.id,
				type: IChannels.ChannelType.GROUP,
				group: group.id,
				description: channel.description
			};
		}

		res.status(503);
		res.send({ error: 'no implemtnetation bad' });
	}

	@Route('/:id')
	@Authenticated()
	@Param('id')
	@DELETE
	async DeleteChannel(req, res, user: User, id: string): Promise<IChannels.DeleteChannel> {
		let channel = await getManager()
			.findOne(Channel, { id });

		if (!channel) {
			res.status(404);
			res.send({ error: 'Channel does not exist!' });

			return;
		}

		if (channel instanceof DMChannel) {
			channel.active = false;
			await getManager().save(channel);
		} else if (channel instanceof GroupChannel) {
			let query = await createQueryBuilder(Group)
				.where('Group.channelId = :id', { id })
				.select(['Group.id', 'Group.ownerId'])
				.limit(1)
				.getRawAndEntities();

			let raw = query.raw[0];
			let group = query.entities[0];

			let members = (await getManager()
				.query('SELECT usersId FROM `groups -> members` WHERE groupsId = ?', [ group.id ]))
				.map(m => { return m.usersId });
			
			if (members.length === 1) {
				// ! PURGE MESSAGES + MEMBERS + DELETE GROUP
				return {};
			}

			if (raw.ownerId === user.id) {
				let notOwner;
				for (let i=0;i<members.length;i++) {
					if (members[i] !== user.id) {
						notOwner = members[i];
						break;
					}
				}

				let newOwner = await getManager()
					.findOne(User, { where: { id: notOwner }, select: [ 'id' ] });

				group.owner = newOwner;
				await getManager().save(group);
			}

			await createQueryBuilder(Group)
				.relation('members')
				.of(group)
				.remove(user);
		}

		return {};
	}

	@Route('/:id/messages')
	@Authenticated()
	@Param('id')
	@Query([false, false, false], 'before', 'after', 'limit')
	@GET
	async GetMessages(req, res, user, target: string, before?: string, after?: string, limit?: number): Promise<IChannels.GetMessages> {
		let qb = createQueryBuilder(Message)
			.where('Message.channelId = :target', { target })
			.orderBy('Message.id', 'DESC')
			.limit(limit ? Math.max(0, Math.min(limit, 100)) : 50);

		if (before) qb = qb.andWhere('Message.id < :before', { before });
		if (after) qb = qb.andWhere('Message.id > :after', { after });

		let messages = await qb.getRawAndEntities();

		let msgs: IChannels.GetMessages = [];
		for (let i=0;i<messages.entities.length;i++) {
			let message = messages.entities[i], raw = messages.raw[i];
			msgs.push({
				id: message.id,
				content: message.content,
				createdAt: message.createdAt.getTime(),
				updatedAt: message.updatedAt.getTime(),
				author: raw.Message_authorId,
				channel: raw.Message_channelId
			})
		}

		return msgs.reverse();
	}

	@Route('/:id/messages')
	@Authenticated()
	@Param('id')
	@Body([true, false], 'content', 'nonce')
	@POST
	async SendMessage(req, res, user, id: string, content: string, nonce?: string): Promise<IChannels.SendMessage | void> {
		content = content.substring(0, 2000);

		let query = await createQueryBuilder(Channel)
			.where('Channel.id = :id', { id })
			.getRawAndEntities();
		
		let channel = query.entities[0];
		if (!channel) {
			res.status(404);
			res.send({ error: "Channel not found!" });

			return;
		}

		let message = new Message();
		message.channel = channel;
		message.content = content;
		message.author = user;
		await getManager().save(message);

		try {
			return { id: message.id };
		} finally {
			let users: string[] = [];
			if (channel instanceof DMChannel) {
				if (!channel.active) {
					channel.active = true;
					await getManager().save(channel);
				}

				users = [ channel.userA.id, channel.userB.id ];
			} else if (channel instanceof GroupChannel) {
				let group = await createQueryBuilder(Group)
					.where('Group.channelId = :id', { id })
					.select('Group.id')
					.getOne();

				users = (await getManager()
					.query('SELECT usersId from `groups -> members` WHERE groupsId = ?', [ group.id ]))
					.map(u => { return u.usersId });
			} else if (channel instanceof GuildChannel) {
				let guild = query.raw[0].guildId;
				users = (await getManager()
					.query('SELECT usersId from `guilds -> members` WHERE guildsId = ?', [ guild ]))
					.map(u => { return u.usersId });
			}

			SendPacket({
				type: 'message',
				id: message.id,
				content: message.content,
				createdAt: message.createdAt.getTime(),
				updatedAt: message.updatedAt.getTime(),
				channel: message.channel.id,
				author: message.author.id,
				nonce
			}, ws => {
				return ws.user ?
					(users.indexOf(ws.user.id) > -1) : false
			});
		}
	}

	@Route('/:id/messages/:mid')
	@Authenticated()
	@Param('id', 'mid')
	@GET
	async Message(req, res, user, channel: string, id: string): Promise<IChannels.Message | void> {
		let query = await createQueryBuilder(Message)
			.where('Message.id = :id', { id })
			.where('Message.channelId = :channel', { channel })
			.getRawAndEntities();
		
		let message = query.entities[0];
		if (!message) {
			res.status(404);
			res.send({ error: 'Message does not exist!' });

			return;
		}

		let raw = query.raw[0];
		return {
			id,
			content: message.content,

			createdAt: +message.createdAt,
			updatedAt: +message.updatedAt,
			
			author: raw.Message_authorId,
			channel: raw.Message_channelId
		};
	}

	@Route('/:id/messages/:mid')
	@Authenticated()
	@Param('id', 'mid')
	@Body('content')
	@POST
	async EditMessage(req, res, user: User, target: string, msg: string, content: string): Promise<IChannels.EditMessage | void> {
		content = content.substring(0, 2000);

		let channel = await dbConn.manager.findOne(Channel, {
			where: {
				id: target
			}
		});

		if (!channel) {
			res.status(404);
			res.send({ error: "Channel not found!" });

			return;
		}

		let check = await createQueryBuilder(Message)
			.where('Message.id = :msg', { msg })
			.select('authorId')
			.getRawOne();

		if (!check) {
			res.status(404);
			res.send({ error: 'Message does not exist!' });

			return;
		}

		if (check.authorId !== user.id) {
			res.status(403);
			res.send({ error: 'Not author of message!' });

			return;
		}

		let message = await dbConn.manager.findOne(Message, {
			where: {
				id: msg
			}
		});

		message.content = content;
		await dbConn.manager.save(message);

		let users: string[] = [];
		if (channel instanceof DMChannel) {
			users = [channel.userA.id, channel.userB.id];
		}

		SendPacket({
			type: 'message',
			id: message.id,
			content: message.content,
			createdAt: +message.createdAt,
			updatedAt: +message.updatedAt,
			channel: channel.id,
			author: user.id
		}, ws => {
			return ws.user ?
				(users.indexOf(ws.user.id) > -1) : false
		});

		return {
			updatedAt: +message.updatedAt
		};
	}

	@Route('/:id/messages/:mid')
	@Authenticated()
	@Param('id', 'mid')
	@DELETE
	async DeleteMessage(req, res, user, channel: string, id: string): Promise<IChannels.DeleteMessage | void> {
		let message = await getManager().findOne(Message, { id });
		
		if (!message) {
			res.status(404);
			res.send({ error: 'Message does not exist!' });

			return;
		}

		await createQueryBuilder(Message)
			.delete()
			.where('id = :id', { id })
			.execute();

		return { };
	}

	@Route('/:id/recipients')
	@Authenticated()
	@Param('id')
	@Body('recipient')
	@POST
	async AddRecipient(req, res, user: User, id: string, recipient: string): Promise<IChannels.AddRecipient | void> {
		let channel = await getRepository(Channel)
			.findOne({ id });

		if (!channel) {
			res.status(404);
			res.send({ error: 'Channel does not exist!' });

			return;
		}

		let target = await getRepository(User)
			.findOne({ where: { id: recipient }, select: [ 'id' ] });

		if (!target) {
			res.status(404);
			res.send({ error: 'Target user does not exist!' });

			return;
		}

		let newid;
		if (channel instanceof DMChannel) {
			if (target.id === channel.userA.id ||
				target.id === channel.userB.id) {
					res.status(403);
					res.send({ error: 'User already in DM!' });

					return;
				}

			let groupChannel = new GroupChannel();
			
			await dbConn.manager.save(groupChannel);

			let group = new Group();
			group.channel = groupChannel;
			group.owner = user;
			group.members = [
				channel.userA,
				channel.userB,
				target
			];
			group.title = group.members.map(x => x.username).join(', ');

			await dbConn.manager.save(group);
			channel = groupChannel;
		} else if (channel instanceof GroupChannel) {
			let group = await createQueryBuilder(Group)
				.where('Group.channelId = :id', { id })
				.select('Group.id')
				.getOne();

			let users: string[] = (await getConnection()
				.query('SELECT usersId FROM `groups -> members` WHERE groupsId = ?', [ group.id ]))
				.map(x => { return x.usersId });

			if (users.includes(recipient)) {
				res.status(403);
				res.send({ error: 'User already in group!' });

				return;
			}

			await createQueryBuilder()
				.relation(Group, 'members')
				.of(group)
				.add(target);
		} else {
			res.status(403);
			res.send('Not a Group or DM channel!');

			return;
		}

		await dbConn.manager.save(channel);

		return {
			id: channel.id
		};
	}
}