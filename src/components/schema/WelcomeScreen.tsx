import { Database, FilePlus, FolderOpen } from "lucide-react";
import { Button } from "#/components/ui/button.tsx";
import type { Project } from "#/lib/project-store.ts";

interface WelcomeScreenProps {
	projectList: { id: string; name: string }[];
	onNewProject: () => void;
	onOpenProject: (id: string) => void;
}

export default function WelcomeScreen({
	projectList,
	onNewProject,
	onOpenProject,
}: WelcomeScreenProps) {
	return (
		<div className="flex items-center justify-center h-full">
			<div className="text-center space-y-6 max-w-sm px-6">
				<div className="flex justify-center">
					<div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center">
						<Database className="size-7 text-primary" />
					</div>
				</div>

				<div className="space-y-1.5">
					<h1 className="text-lg font-semibold tracking-tight">
						Schema View
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						Write DDL in the editor and visualize your database schema as an
						interactive graph with relationships.
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<Button onClick={onNewProject} className="gap-2">
						<FilePlus className="size-4" />
						New Project
					</Button>

					{projectList.length > 0 && (
						<div className="space-y-1.5">
							<p className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60 pt-2">
								Recent projects
							</p>
							<div className="flex flex-col gap-1">
								{projectList.map((p) => (
									<Button
										key={p.id}
										variant="outline"
										size="sm"
										onClick={() => onOpenProject(p.id)}
										className="justify-start gap-2 w-full"
									>
										<FolderOpen className="size-3.5 shrink-0 text-muted-foreground" />
										<span className="truncate">{p.name}</span>
									</Button>
								))}
							</div>
						</div>
					)}
				</div>

				<p className="text-2xs text-muted-foreground/40">
					All data is stored locally in your browser.
				</p>
			</div>
		</div>
	);
}
