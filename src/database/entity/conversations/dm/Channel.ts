import { ManyToOne, ChildEntity } from 'typeorm';
import { Channel } from '../Channel';
import { User } from '../../user/User';

@ChildEntity()
export class DMChannel extends Channel {
	@ManyToOne(type => User)
	userA: User;
	
	@ManyToOne(type => User)
    userB: User;
}