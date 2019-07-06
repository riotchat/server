import Routable, { Route, POST, Path, GET, Query, Body, Authenticated, DELETE, Param } from '../../Routable';
import * as IChannels from '../../../api/v1/channels';
import { dbConn } from '../../../database';
import { Channel, Message, DMChannel, User, GroupChannel, Group } from '../../../database/entity/imports';
import { createQueryBuilder } from 'typeorm';
import { SendPacket } from '../../../websocket';

export class Channels extends Routable {
	@Path('/api/v1/channels')
	path;

	@Route('/:id')
	@Authenticated()
	@Param('id')
	@GET
	async Channel(req, res, user: User, target: string): Promise<IChannels.Channel | void> {
		let channel = await dbConn.manager.findOne(Channel, {
			where: {
				id: target
			}
		});

		if (channel instanceof DMChannel) {
			return {
				id: channel.id,
				type: IChannels.ChannelType.DM,
				users: [
					channel.userA.id,
					channel.userB.id
				]
			};
		}

		res.status(503);
		res.send({ error: 'no implemtnetation bad' });
	}

	@Route('/:id/messages')
	@Authenticated()
	@Param('id')
	@GET
	async GetMessages(req, res, user, target: string): Promise<IChannels.GetMessages> {
		let messages = await createQueryBuilder(Message)
			.where('Message.channelId = :target', { target })
			.getRawMany();

		let msgs: IChannels.GetMessages = [];
		messages.forEach(message => {
			msgs.push({
				id: message.Message_id,
				content: message.Message_content,
				createdAt: message.Message_createdAt,
				updatedAt: message.Message_updatedAt,
				author: message.Message_authorId,
				channel: message.Message_channelId
			})
		});

		return msgs;
	}

	@Route('/:id/messages')
	@Authenticated()
	@Param('id')
	@Body('content')
	@POST
	async SendMessage(req, res, user, target: string, content: string): Promise<IChannels.SendMessage | void> {
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

		let message = new Message();
		message.channel = channel;
		message.content = content;
		message.author = user;
		await dbConn.manager.save(message);

		let users: string[] = [];
		if (channel instanceof DMChannel) {
			users = [channel.userA.id, channel.userB.id];
		}

		SendPacket({
			type: 'message',
			id: message.id,
			content: message.content,
			createdAt: message.createdAt.getTime(),
			updatedAt: message.updatedAt.getTime(),
			channel: message.channel.id,
			author: message.author.id
		}, ws => {
			return ws.user ?
				(users.indexOf(ws.user.id) > -1) : false
		});

		return {
			id: message.id
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

	@Route('/:id/recipients')
	@Authenticated()
	@Param('id')
	@Body('recipient')
	@POST
	async AddRecipient(req, res, user: User, id: string, recipient: string): Promise<IChannels.AddRecipient | void> {
		let channel = await dbConn.manager.findOne(Channel, {
			where: {
				id
			}
		});

		if (!channel) {
			res.status(404);
			res.send({ error: 'Channel does not exist!' });

			return;
		}

		let target = await dbConn.manager.findOne(User, {
			where: {
				id: recipient
			}
		});

		if (!target) {
			res.status(404);
			res.send({ error: 'Target user does not exist!' });

			return;
		}

		let newid;
		if (channel instanceof DMChannel) {
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
			let group = await dbConn.manager.findOne(Group, {
				where: {
					channel
				}
			});

			let builder = dbConn
				.createQueryBuilder()
				.relation(Group, 'members')
				.of(group);

			let res = await builder.execute();
			console.log(res);
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