import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 32
	})
	username: string;

	@Column()
	password: string;

	@Column({
		length: 254 /** RFC 2821 */
	})
	email: string;
};