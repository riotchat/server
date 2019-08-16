import Routable, { Route, Path, GET, Authenticated, Param, POST, Body, Query } from '../../Routable';
import * as IGuilds from '../../../api/v1/api/guilds';
import { User, Guild, GuildChannel } from '../../../database/entity/imports';
import { createQueryBuilder, getManager, getConnection } from 'typeorm';
import { ChannelType, Channel } from '../../../api/v1/api/channels';

export class Guilds extends Routable {
	@Path('/api/v1/guilds')
	path;

	@Route('/create')
	@Authenticated()
	@Body('name')
	@POST
	async CreateGuild(req, res, user: User, name: string): Promise<IGuilds.CreateGuild> {
		let guild = new Guild();
		guild.name = name;
		guild.owner = user;
		guild.members = [ user ];
		await getManager().save(guild);

		let defaultChannel = new GuildChannel();
		defaultChannel.name = 'default';
		defaultChannel.guild = guild;
		await getManager().save(defaultChannel);

		return {
			id: guild.id
		};
	}

	@Route('/list')
	@Authenticated()
	@Query([false], 'sync')
	@GET
	async GetGuilds(req, res, user: User, sync: 'true' | undefined): Promise<IGuilds.GetGuilds> {
		let users = await getConnection()
			.query("SELECT guildsId FROM `guilds -> members` WHERE usersId = ?", [user.id]);

		if (sync !== 'true')
			return users.map(u => { return u.guildsId; });
	
		if (users.length < 1)
			return [];

		let qb = createQueryBuilder(Guild), ids = [];
		users.forEach((x, i) => {
			ids.push(x.guildsId);
			qb = qb
				.orWhere(`Guild.id = :${i}`)
				.setParameter(i.toString(), x.guildsId)
		});

		let query = await qb
			.getRawAndEntities();

		let sql = 'SELECT * FROM `channels` WHERE guildId = ?' + ' OR guildId = ?'.repeat(ids.length - 1);
		let all_channels = await getConnection().query(sql, ids);

		let guilds: IGuilds.GetGuilds = [];
		for (let i=0;i<query.entities.length;i++) {
			let guild = query.entities[i];

			guilds.push({
				id: guild.id,
				createdAt: +guild.createdAt,
				iconURL: guild.iconURL,
				name: guild.name,
				owner: query.raw[i].ownerId,
				channels: all_channels
					.filter(x => x.guildId === guild.id)
					.map(x => {
						return {
							id: x.id,
							type: ChannelType.GUILD,
							name: x.name,
							guild: x.guildId,
							description: x.description
						}
					})
			});
		}

		return guilds;
	}

	@Route('/:id')
	@Authenticated()
	@Param('id')
	@GET
	async Guild(req, res, user: User, id: string): Promise<IGuilds.Guild | void> {
		let guilds = await createQueryBuilder(Guild)
			.where('Guild.id = :id', { id })
			.getRawAndEntities();
		
		if (guilds.entities.length < 1) {
			res.status(404);
			res.send({ error: 'Not found.' });

			return;
		}

		let guild = guilds.entities[0];
		let channels = await createQueryBuilder(GuildChannel)
				.where('GuildChannel.guildId = :id', { id })
				.getMany();

		return {
			id: guild.id,
			createdAt: +guild.createdAt,
			iconURL: guild.iconURL,
			name: guild.name,
			owner: guilds.raw[0].ownerId,
			channels: channels
				.map(x => {
					return {
						id: x.id,
						type: ChannelType.GUILD,
						name: x.name,
						guild: x.guild,
						description: x.description
					}
				}) as any as Channel[]
		};
	}
}