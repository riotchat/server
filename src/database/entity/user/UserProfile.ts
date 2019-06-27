import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Status } from '../../../api/v1/users';

@Entity({ name: 'users -> profile' })
export class UserProfile {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	status: Status;

	@Column()
	avatarURL: string;
};