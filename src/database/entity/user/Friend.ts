import { Entity, Column, ManyToOne, OneToOne, BeforeInsert, PrimaryColumn, JoinColumn } from 'typeorm';
import { User } from './User';
import { ulid } from 'ulid';
import { FriendType } from '../../../api/v1/users';

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
	@JoinColumn()
	user: User;

	@ManyToOne(type => User)
	@JoinColumn()
	friend: User;

	@Column()
	status: FriendType;
};