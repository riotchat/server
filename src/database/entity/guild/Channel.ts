import { ChildEntity, Column } from 'typeorm';
import { Channel } from '../Channel';

@ChildEntity()
export class GuildChannel extends Channel {
	@Column({
		length: 64
	})
	description: string;
}