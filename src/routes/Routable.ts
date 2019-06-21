import router from '.';
import { Response } from 'express';

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

		router[method.toLowerCase()](route, async (req, res: Response) => {
			let ret = await descriptor.value(...arguments);
			if (ret) res.send(ret);
		});
	};
}

export function POST(target: any, key: string, descriptor: PropDescriptor) {
	descriptor.method = 'POST';
}

export function GET(target: any, key: string, descriptor: PropDescriptor) {
	descriptor.method = 'GET';
}