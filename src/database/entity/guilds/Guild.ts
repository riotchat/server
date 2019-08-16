import { Entity, Column, ManyToOne, ManyToMany, JoinTable, BeforeInsert, PrimaryColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { GuildChannel } from './Channel';
import { User } from '../user/User';
import { ulid } from 'ulid';

@Entity({ name: 'guilds' })
export class Guild {
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

	@Column()
	iconURL: string;

	@Column({
		length: 32
	})
	name: string;

	@ManyToOne(type => User)
	owner: User;

	@ManyToMany(type => User, { eager: true })
	@JoinTable({ name: 'guilds -> members' })
	members: User[];
}