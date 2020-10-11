import Stream from "mithril/stream";

const enum ConnectionStatus {
	OPEN,
	CLOSE,
}

export class Socket {
	socket: WebSocket;
	connectionStatus: Stream<number>;

	constructor() {
		this.connectionStatus = Stream<ConnectionStatus>(WebSocket.CLOSED);

		this.socket = new WebSocket("ws://localhost:3041/ws");
		this.socket.onopen = this.onOpen.bind(this);
		this.socket.onmessage = this.onMessage.bind(this);
		this.socket.onclose = this.onClose.bind(this);
		this.socket.onerror = this.onError.bind(this);
	}

	onOpen(event: Event) {
		console.log("[open] Connection established");
		console.log("Sending to server");
		this.socket.send("My name is John");
	}

	onMessage(event: MessageEvent) {
		console.log(`[message] Data received from server: ${event.data}`);
	}

	onClose(event: CloseEvent) {
		if (event.wasClean) {
			console.log(`[close] Connection closed cleanly, code=${event.code} reason=${event.reason}`);
		} else {
			// E.g. server process killed or network down
			// Event.code is usually 1006 in this case
			console.log("[close] Connection died");
		}
	}

	onError(error: ErrorEvent) {
		console.error(error.message, error.error);
	}

	get readyState(): number {
		return this.socket.readyState;
	}

}
