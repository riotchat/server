import { ManyToOne, ChildEntity, Column } from 'typeorm';
import { Channel } from '../Channel';
import { User } from '../../user/User';

@ChildEntity()
export class DMChannel extends Channel {
	@ManyToOne(type => User, { eager: true })
	userA: User;
	
	@ManyToOne(type => User, { eager: true })
	userB: User;
	
	@Column({ default: false })
	active: boolean;
}