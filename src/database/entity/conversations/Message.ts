import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, PrimaryColumn, BeforeInsert, UpdateDateColumn, CreateDateColumn } from 'typeorm';
import { Channel } from './Channel';
import { User } from '../user/User';

import { ulid } from 'ulid';

@Entity({ name: 'messages' })
export class Message {  
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

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt: Date;

	@Column({
		length: 2000
	})
	content: string;

	@ManyToOne(type => User)
	author: User;
	
	@ManyToOne(type => Channel, channel => channel.messages)
	channel: Channel;
}