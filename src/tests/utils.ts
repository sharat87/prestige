import { Context } from "../scripts/Context";

export function makeMockContext(): Context {
	return {
		data: {},
		run: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
		emit: jest.fn(),
		authHeader: jest.fn(),
	};
}
