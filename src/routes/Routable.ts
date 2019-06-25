import router from '.';
import { Response, Request } from 'express';
import { dbConn } from '../database';
import { User } from '../database/entity/imports';

export default class Routable {
	path: string;
};

interface PropDescriptor extends PropertyDescriptor {
	method?: string
};

export function Path(path: string) {
	return (target: Routable, key: string) => {
		target.path = path;
	};
}

export function Route(path: string) {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let method = descriptor.method;
		let route = target.path + path;

		router[method.toLowerCase()](route, async (req: Request, res: Response) => {
			let ret = await descriptor.value(req, res);
			if (ret) res.send(ret);
		});
	};
}

function GetParser(child: 'param' | 'body' | 'query', ...parameters: string[]) {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let func = descriptor.value;
		descriptor.value = async (...args) => {
			let forwarded = [];

			for (let i=0;i<parameters.length;i++) {
				let param = parameters[i];
				let o = args[0][child][param];

				if (!o) {
					args[1].status(422);
					args[1].send({ error: `Missing field ${param}!` });

					return;
				}

				forwarded.push(o);
			};

			return await func(...args, ...forwarded);
		};

		return descriptor;
	};
}

export function Parameters(...parameters: string[]) {
	return GetParser('param', ...parameters);
}

export function Query(...parameters: string[]) {
	return GetParser('query', ...parameters);
}

export function Body(...parameters: string[]) {
	return GetParser('body', ...parameters);
}

export function Authenticated() {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let func = descriptor.value;
		descriptor.value = async (...args) => {
			let accessToken = args[0].headers.authorization;

			let user = await dbConn.manager.findOne(User, {
				where: {
					accessToken
				}
			});

			if (!user) {
				args[1].status(403);
				args[1].send({ error: 'Not authorised!' });
				return;
			}

			return await func(...args, user);
		};

		return descriptor;
	};
}

export function POST(target: any, key: string, descriptor: PropDescriptor) {
	descriptor.method = 'POST';
}

export function GET(target: any, key: string, descriptor: PropDescriptor) {
	descriptor.method = 'GET';
}

export function DELETE(target: any, key: string, descriptor: PropDescriptor) {
	descriptor.method = 'DELETE';
}