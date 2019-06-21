import { PrimaryGeneratedColumn, Entity, OneToOne, JoinColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { GroupChannel } from './Channel';
import { User } from '../auth/User';

@Entity()
export class Group {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 32
	})
	title: string;

	@ManyToOne(type => User)
	owner: User;

	@OneToOne(type => GroupChannel, channel => channel.group, { eager: true })
	@JoinColumn()
	channel: GroupChannel;

	@ManyToMany(type => User, { eager: true })
	@JoinTable()
	members: User[];
}