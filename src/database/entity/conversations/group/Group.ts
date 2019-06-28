import { PrimaryGeneratedColumn, Entity, OneToOne, JoinColumn, Column, ManyToOne, ManyToMany, JoinTable, CreateDateColumn, BeforeInsert, PrimaryColumn } from 'typeorm';
import { GroupChannel } from './Channel';
import { User } from '../../user/User';
import { ulid } from 'ulid';

@Entity({ name: 'groups' })
export class Group {
	@PrimaryColumn({
		length: 26
	})
	id: string;

	@BeforeInsert()
	private beforeInsert() {
		this.id = ulid();
	}

	@CreateDateColumn({ type: "timestamp" })
    createdAt: Date;

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
	@JoinTable({ name: 'groups -> members' })
	members: User[];
}