import { Entity, PrimaryGeneratedColumn, TableInheritance, OneToMany, PrimaryColumn, BeforeInsert, Column } from 'typeorm';
import { Message } from './Message';

import { ulid } from 'ulid';

@Entity({ name: 'channels' })
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class Channel {
	@PrimaryColumn({
		length: 26
	})
	id: string;

	@BeforeInsert()
	private beforeInsert() {
		this.id = ulid();
	}

	@OneToMany(type => Message, message => message.channel)
	messages: Message[];
}