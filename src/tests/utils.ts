export function makeMockContext() {
	return {
		data: {},
		run: jest.fn(),
		on: jest.fn(),
		off: jest.fn(),
	};
}
