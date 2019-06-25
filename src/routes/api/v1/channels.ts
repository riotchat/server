import Routable, { Route, POST, Path, GET, Query, Body, Authenticated, DELETE, Param } from '../../Routable';
import * as IChannels from '../../../api/v1/channels';
import { dbConn } from '../../../database';
import { Channel, Message } from '../../../database/entity/imports';
import { createQueryBuilder } from 'typeorm';

export class Channels extends Routable {
	@Path('/api/v1/channels')
	path;

	@Route('/:id')
	@Authenticated()
	@Param('id')
	@GET
	async Channel(req, res, user, target: string): Promise<IChannels.Channel | void> {
		let channel = dbConn.manager.findOne(Channel, {
			where: {
				id: target
			}
		});
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

		return {
			id: message.id
		};
	}
}