import http from '../main';
import WebSocket, { Server } from 'ws';
import { Packets, ClientPackets } from '../api/ws/v1';
import { User } from '../database/entity/imports';
import { dbConn } from '../database';
import Logger from '../system/logging';

const wss = new Server({ server: http, path: "/ws" });

interface RiotSocket extends WebSocket {
	user: User
	sendPacket: (data: Packets) => void
};

export function SendPacket(obj: Packets, filter?: (ws: RiotSocket) => boolean) {
	let clients: WebSocket[] = [];
	wss.clients.forEach(c => clients.push(c));

	if (filter) {
		clients = clients
			.filter((ws: RiotSocket) => !!ws.user)
			.filter(filter);
	}

	clients.forEach((client: RiotSocket) => client.sendPacket(obj));
}

wss.on('connection', (ws: RiotSocket) => {
	let authenticated = false;

	ws.sendPacket = data => ws.send(JSON.stringify(data));

	ws.on('message', async (payload: string) => {
		if (authenticated) return;
		
		let data: ClientPackets = JSON.parse(payload);
		switch (data.type) {
			case 'authenticate':
				{
					let user = await dbConn.manager.findOne(User, {
						where: {
							accessToken: data.token
						}
					});

					if (user) {
						Logger.debug(`Websocket client: ${user.id} logged in.`);
						ws.sendPacket({
							type: 'authenticated'
						});

						authenticated = true;
					} else {
						ws.sendPacket({
							type: 'error',
							error: 'Unauthorised token!'
						});
					}
				}
				break;
		}
	});
});