import http from '../main';
import WebSocket, { Server } from 'ws';
import { Packets } from '../api/ws/v1';

export const wss = new Server({ server: http, path: "/ws" });

export function SendPacket(obj: Packets, filter?: (ws: WebSocket) => boolean) {
	let clients: WebSocket[] = [];
	wss.clients.forEach(c => clients.push(c));

	if (filter) {
		clients = clients.filter(filter);
	}

	clients.forEach(client =>
		client.send(JSON.stringify(obj))
	);
}

wss.on('connection', (ws: WebSocket) => {
	console.log('connected');

	//ws.on('message', (data) => {
	//	console.log(data);
	//});
});