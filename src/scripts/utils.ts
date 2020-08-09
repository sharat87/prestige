export function isPromise(object: { then: () => void }): boolean {
	return object != null && typeof object.then === "function";
}
