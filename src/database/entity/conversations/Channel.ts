import { Entity, PrimaryGeneratedColumn, TableInheritance, OneToMany } from 'typeorm';
import { Message } from './Message';

@Entity({ name: 'channels' })
@TableInheritance({ column: { type: "varchar", name: "type" } })
export class Channel {
	@PrimaryGeneratedColumn()
	id: number;

	@OneToMany(type => Message, message => message.channel)
	messages: Message[];
}