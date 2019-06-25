import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn } from 'typeorm';
import { TwoFactor } from '../auth/TwoFactor';
import { UserProfile } from './UserProfile';

@Entity({ name: 'users' })
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

	@Column({
		length: 64
	})
	accessToken: string;

	@OneToOne(type => TwoFactor)
	@JoinColumn()
	options2FA: TwoFactor;

	@OneToOne(type => UserProfile)
	@JoinColumn()
	userProfile: UserProfile;
};