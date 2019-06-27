import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToOne } from 'typeorm';
import { User } from './User';

@Entity({ name: 'users -> friends' })
export class Friend {
	@PrimaryGeneratedColumn()
	id: number;

	@ManyToOne(type => User)
	user: User;

	@ManyToOne(type => User)
	friend: User;

	@OneToOne(type => Friend, friend => friend.linkedTo)
	linkedTo: Friend;

	@Column()
	pending: boolean;
};