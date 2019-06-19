import { ChildEntity, Column, OneToOne } from 'typeorm';
import { Channel } from '../Channel';
import { Group } from './Group';

@ChildEntity()
export class GroupChannel extends Channel {	
	@OneToOne(type => Group, group => group.channel)
	group: Group;
}