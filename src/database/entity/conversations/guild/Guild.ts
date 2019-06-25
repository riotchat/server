import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { GuildChannel } from './Channel';
import { User } from '../../user/User';

@Entity({ name: 'guilds' })
export class Guild {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 32
	})
	name: string;

	@ManyToOne(type => User)
	owner: User;

	@ManyToMany(type => GuildChannel, { eager: true })
	channels: GuildChannel[];

	@ManyToMany(type => User, { eager: true })
	@JoinTable({ name: 'guilds -> members' })
	members: User[];
}