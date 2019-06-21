import router from '.';
import { Response, Request } from 'express';

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

export function Query(...parameters: string[]) {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let func = descriptor.value;
		descriptor.value = async (...args) => {
			let forwarded = [];

			parameters.forEach(param => {
				forwarded.push(args[0].query[param]);
			});

			return await func(...args, ...forwarded);
		};

		return descriptor;
	};
}

export function Body(...parameters: string[]) {
	return (target: Routable, key: string, descriptor: PropDescriptor) => {
		let func = descriptor.value;
		descriptor.value = async (...args) => {
			let forwarded = [];

			parameters.forEach(param => {
				forwarded.push(args[0].body[param]);
			});

			return await func(...args, ...forwarded);
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