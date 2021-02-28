export interface MultiPartFormValue {
	body: string,
	name: string,
	type: string,
	size: number,
}

export class MultiPartForm extends Map<string, string | MultiPartFormValue> {}
