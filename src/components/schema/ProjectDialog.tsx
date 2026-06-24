import { useCallback, useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Button } from "#/components/ui/button.tsx";

interface ProjectDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	mode: "create" | "rename";
	initialName?: string;
	onSubmit: (name: string) => void;
}

export default function ProjectDialog({
	open,
	onOpenChange,
	mode,
	initialName = "",
	onSubmit,
}: ProjectDialogProps) {
	const [name, setName] = useState(initialName);

	const handleSubmit = useCallback(() => {
		const trimmed = name.trim();
		if (!trimmed) return;
		onSubmit(trimmed);
		setName("");
		onOpenChange(false);
	}, [name, onSubmit, onOpenChange]);

	const handleOpenChange = useCallback(
		(v: boolean) => {
			if (!v) setName("");
			onOpenChange(v);
		},
		[onOpenChange],
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>
						{mode === "create" ? "New Project" : "Rename Project"}
					</DialogTitle>
					<DialogDescription>
						{mode === "create"
							? "Create a new project to save your schema DDL."
							: "Enter a new name for this project."}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						handleSubmit();
					}}
				>
					<Input
						value={name}
						onChange={(e) => setName(e.target.value)}
						placeholder="Project name"
						autoFocus
						className="mb-4"
					/>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={!name.trim()}>
							{mode === "create" ? "Create" : "Rename"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
