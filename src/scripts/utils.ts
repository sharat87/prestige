export function isPromise(object) {
	return object != null && typeof object.then === "function";
}
