import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type React from "react";
import { ThemeProvider } from "#/components/theme-provider.tsx";
import { Toaster } from "#/components/ui/sonner.tsx";
import { TooltipProvider } from "#/components/ui/tooltip.tsx";
import "../styles.css";

export const Route = createRootRoute({
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<>
			<ThemeProvider defaultTheme="system" storageKey="theme">
				<TooltipProvider>
					{children}
					<Toaster closeButton richColors />
				</TooltipProvider>
			</ThemeProvider>
			<TanStackDevtools
				config={{
					position: "bottom-right",
				}}
				plugins={[
					{
						name: "Tanstack Router",
						render: <TanStackRouterDevtoolsPanel />,
					},
				]}
			/>
		</>
	);
}

