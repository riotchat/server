import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class TwoFactor {
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		default: 'none'
	})
	mode: 'totp' | 'email' | 'none';
};