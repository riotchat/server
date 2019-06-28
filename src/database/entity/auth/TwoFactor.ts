import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert, PrimaryColumn } from 'typeorm';
import { ulid } from 'ulid';

@Entity({ name: 'users -> 2fa' })
export class TwoFactor {
	@PrimaryColumn({
		length: 26
	})
	id: string;

	@BeforeInsert()
	private beforeInsert() {
		this.id = ulid();
	}

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