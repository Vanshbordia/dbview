const TYPE_COLORS: Record<string, string> = {
	SERIAL:
		"bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
	INTEGER: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	BIGINT: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	SMALLINT: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	INT: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	INT8: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	INT16: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	INT32: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	INT64: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	INT128: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	INT256: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UINT8: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UINT16: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UINT32: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UINT64: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UINT128: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UINT256: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
	UUID: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
	BOOLEAN: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
	BOOL: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
	VARCHAR:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	TEXT: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	CHAR: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	STRING:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	FIXEDSTRING:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	TIMESTAMP:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	DATE: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	TIME: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	DATETIME:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	DATETIME64:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	DATE32:
		"bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
	NUMERIC:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	DECIMAL:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	FLOAT:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	FLOAT32:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	FLOAT64:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	DOUBLE:
		"bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	REAL: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
	JSON: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
	JSONB: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300",
	BYTEA: "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-300",
	OID: "bg-stone-100 text-stone-800 dark:bg-stone-900/40 dark:text-stone-300",
	ARRAY: "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300",
	MAP: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
	LOWCARDINALITY:
		"bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
	NULLABLE: "bg-zinc-100 text-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300",
	TUPLE: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
	ENUM8:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
	ENUM16:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
	IPV4: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
	IPV6: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/40 dark:text-fuchsia-300",
	NESTED: "bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300",
	POINT: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
};

export function getTypeColor(type: string): string {
	const base = type
		.replace(/\(.*\)/, "")
		.trim()
		.toUpperCase();
	return (
		TYPE_COLORS[base] ??
		"bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
	);
}

function unwrapWrapper(t: string): string {
	const match = t.match(/^(NULLABLE|LOWCARDINALITY)\s*\(/i);
	if (!match) return t;
	const prefix = match[0];
	let depth = 1;
	for (let i = prefix.length; i < t.length; i++) {
		if (t[i] === "(") depth++;
		if (t[i] === ")") {
			depth--;
			if (depth === 0) {
				return t.slice(prefix.length, i);
			}
		}
	}
	return t;
}

export function simplifyType(type: string): string {
	let t = type.trim();
	while (true) {
		const inner = unwrapWrapper(t);
		if (inner === t) break;
		t = inner;
	}
	return t.replace(/\(.*\)/g, "").trim();
}
