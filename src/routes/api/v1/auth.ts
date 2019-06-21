import Routable, { Route, POST, Path, GET } from '../../Routable';
import * as IAuth from '../../../api/v1/auth';

export class Auth extends Routable {
	@Path('/api/v1')
	path;

	@Route('/auth/authenticate')
	@POST
	async Authenticate(): Promise<IAuth.Authenticate> {
		return {
			do2FA: false,
			username: 'username',
			accessToken: 'string'
		};
	}
}