interface DataRecord {
	data: Record<string, unknown>
}

export default function interpolate(content: string, context: unknown): string {
	const keys: string[] = []
	const values: unknown[] = []

	if (isDataRecord(context)) {
		for (const [key, value] of Object.entries(context.data)) {
			keys.push(key)
			values.push(value)
		}
	}

	const val = new Function(...keys, "return `" + content + "`;").apply(context, values)
	return val == null ? "" : val.toString()
}

function isDataRecord(object: unknown): object is DataRecord {
	return object != null
		&& typeof object === "object"
		&& typeof (object as DataRecord).data === "object"
		&& (object as DataRecord).data != null
}
