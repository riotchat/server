import { Entity, PrimaryGeneratedColumn, Column, PrimaryColumn, BeforeInsert } from 'typeorm';
import { Status } from '../../../api/v1/users';
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
	avatarURL: string;
};