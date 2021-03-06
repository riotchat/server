import router from '.';
import { Response, Request } from 'express';
import { dbConn } from '../database';
import { User } from '../database/entity/imports';
import { APIError, GetError, SendError } from '../api/v1/errors';

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

function GetParser(child: 'params' | 'body' | 'query', ...parameters: (string | boolean[])[]) {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let func = descriptor.value;
		descriptor.value = async (...args) => {
			let forwarded = [];
			let check;

			if (Array.isArray(parameters[0])) {
				check = parameters[0] as boolean[];
			}

			for (let i=0;i<parameters.length;i++) {
				if (check && i == 0) continue;

				let param = parameters[i] as string;
				let o = args[0][child][param];

				if (!o && (!check || check[i])) {
					SendError(args[1], APIError.MISSING_FIELDS, `Lacking ${param} field.`);
					return;
				}

				forwarded.push(o);
			};

			return await func(...args, ...forwarded);
		};

		return descriptor;
	};
}

export function Param(...parameters: (string | boolean[])[]) {
	return GetParser('params', ...parameters);
}

export function Query(...parameters: (string | boolean[])[]) {
	return GetParser('query', ...parameters);
}

export function Body(...parameters: (string | boolean[])[]) {
	return GetParser('body', ...parameters);
}

export type OnFail = (error: APIError, details?: string) => void;
export function CanFail() {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let func = descriptor.value;
		descriptor.value = async (...args) => {
			function onFail(error: APIError, details?: string) {
				SendError(args[1], error, details);
			}

			return await func(...args, onFail);
		};

		return descriptor;
	};
}

export function Authenticated(relations?: string[]) {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let func = descriptor.value;
		descriptor.value = async (...args) => {
			let accessToken = args[0].headers.authorization;

			let repo = dbConn.getRepository(User);
			let user = await repo.findOne({
				accessToken
			}, {
				relations
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

export function PUT(target: any, key: string, descriptor: PropDescriptor) {
	descriptor.method = 'PUT';
}

export function DELETE(target: any, key: string, descriptor: PropDescriptor) {
	descriptor.method = 'DELETE';
}