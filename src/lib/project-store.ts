export interface Project {
	id: string;
	name: string;
	ddl: string;
	createdAt: number;
	updatedAt: number;
}

const PROJECTS_KEY = "dbview:projects";
const ACTIVE_KEY = "dbview:activeProjectId";

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getProjectList(): { id: string; name: string; createdAt: number; updatedAt: number }[] {
	try {
		return JSON.parse(localStorage.getItem(PROJECTS_KEY) ?? "[]");
	} catch {
		return [];
	}
}

function saveProjectList(list: { id: string; name: string; createdAt: number; updatedAt: number }[]): void {
	localStorage.setItem(PROJECTS_KEY, JSON.stringify(list));
}

export function getProject(id: string): Project | null {
	try {
		const raw = localStorage.getItem(`dbview:project:${id}`);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function saveProject(project: Project): void {
	localStorage.setItem(`dbview:project:${project.id}`, JSON.stringify(project));
}

export function createProject(name: string, ddl = ""): Project {
	const project: Project = {
		id: generateId(),
		name,
		ddl,
		createdAt: Date.now(),
		updatedAt: Date.now(),
	};
	const list = getProjectList();
	list.push({ id: project.id, name: project.name, createdAt: project.createdAt, updatedAt: project.updatedAt });
	saveProjectList(list);
	saveProject(project);
	return project;
}

export function updateProject(id: string, updates: Partial<{ name: string; ddl: string }>): Project | null {
	const project = getProject(id);
	if (!project) return null;
	Object.assign(project, updates, { updatedAt: Date.now() });
	saveProject(project);
	// Update list entry
	const list = getProjectList();
	const entry = list.find((e) => e.id === id);
	if (entry) {
		if (updates.name !== undefined) entry.name = updates.name;
		entry.updatedAt = project.updatedAt;
		saveProjectList(list);
	}
	return project;
}

export function deleteProject(id: string): void {
	localStorage.removeItem(`dbview:project:${id}`);
	const list = getProjectList().filter((e) => e.id !== id);
	saveProjectList(list);
	if (getActiveProjectId() === id) {
		setActiveProjectId(null);
	}
}

export function getActiveProjectId(): string | null {
	try {
		return localStorage.getItem(ACTIVE_KEY);
	} catch {
		return null;
	}
}

export function setActiveProjectId(id: string | null): void {
	if (id) {
		localStorage.setItem(ACTIVE_KEY, id);
	} else {
		localStorage.removeItem(ACTIVE_KEY);
	}
}

export function renameProject(id: string, name: string): Project | null {
	return updateProject(id, { name });
}
