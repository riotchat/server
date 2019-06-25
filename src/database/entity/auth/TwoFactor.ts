import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'users -> 2fa' })
export class TwoFactor {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		default: 'none'
	})
	mode: 'totp' | 'email' | 'none';

	@Column()
	token: string;

	@Column({
		nullable: true
	})
	totpKey: string;
};