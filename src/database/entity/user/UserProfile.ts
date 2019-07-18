import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, BeforeInsert } from 'typeorm';
import { Status, Activity } from '../../../api/v1/api/users';
import { ulid } from 'ulid';

@Entity({ name: 'users -> profile' })
export class UserProfile {
	@PrimaryColumn({
		length: 26
	})
	id: string;

	@BeforeInsert()
	private beforeInsert() {
		this.id = ulid();
	}

	@Column()
	status: Status;

	@Column()
	activity: string;

	@Column({ default: Activity.None })
	activityType: Activity;

	@Column()
	avatarURL: string;
};