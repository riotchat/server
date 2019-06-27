import { ChildEntity, Column, OneToOne, JoinColumn } from 'typeorm';
import { Channel } from '../Channel';
import { Group } from './Group';

@ChildEntity()
export class GroupChannel extends Channel {	
	@OneToOne(type => Group, group => group.channel)
	@JoinColumn()
	group: Group;

	@Column({
		length: 64
	})
	description: string;
}