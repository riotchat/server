import { Entity, Column, PrimaryGeneratedColumn, OneToOne, JoinColumn, PrimaryColumn, BeforeInsert, CreateDateColumn } from 'typeorm';
import { TwoFactor } from '../auth/TwoFactor';
import { UserProfile } from './UserProfile';
import { User as IUser, FriendType } from '../../../api/v1/users';

import { ulid } from 'ulid';

@Entity({ name: 'users' })
export class User {
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

	toIUser(relation: FriendType, includeEmail: boolean = false): IUser {
		return {
			id: this.id,
			username: this.username,
			createdAt: +this.createdAt,
			email: includeEmail ? this.email : undefined,

			status: this.userProfile.status,
			activity: {
				type: this.userProfile.activityType,
				custom: this.userProfile.activity
			},
			avatarURL: this.userProfile.avatarURL,

			relation
		};
	}
};