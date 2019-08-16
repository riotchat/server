import { ChildEntity, Column, ManyToOne } from 'typeorm';
import { Channel } from '../conversations/Channel';
import { Guild } from './Guild';

@ChildEntity()
export class GuildChannel extends Channel {
	@ManyToOne(type => Guild)
	guild: Guild;

	@Column()
	name: string;
	
	@Column({
		length: 64
	})
	description: string;
}