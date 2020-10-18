export function isPromise(object: any): boolean {
	return object != null && typeof object.then === "function";
}
