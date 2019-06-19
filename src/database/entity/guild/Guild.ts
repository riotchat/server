import { PrimaryGeneratedColumn, Entity, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { GuildChannel } from './Channel';
import { User } from '../User';

@Entity()
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
	@JoinTable()
	channels: GuildChannel[];

	@ManyToMany(type => User, { eager: true })
	@JoinTable()
	members: User[];
}