import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Channel } from './Channel';

@Entity({ name: 'messages' })
export class Message {  
	@PrimaryGeneratedColumn()
	id: number;

	@Column({
		length: 2000
	})
	content: string;
	
	@ManyToOne(type => Channel, channel => channel.messages)
	channel: Channel;
}