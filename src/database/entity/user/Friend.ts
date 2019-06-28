import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne, BeforeInsert, PrimaryColumn } from 'typeorm';
import { User } from './User';
import { ulid } from 'ulid';

@Entity({ name: 'users -> friends' })
export class Friend {
	@PrimaryColumn({
		length: 26
	})
	id: string;

	@BeforeInsert()
	private beforeInsert() {
		this.id = ulid();
	}

	@ManyToOne(type => User)
	user: User;

	@ManyToOne(type => User)
	friend: User;

	@OneToOne(type => Friend, friend => friend.linkedTo)
	linkedTo: Friend;

	@Column()
	pending: boolean;
};