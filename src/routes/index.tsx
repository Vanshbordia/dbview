import { createFileRoute } from "@tanstack/react-router";
import SchemaPage from "#/components/schema/SchemaPage.tsx";

export const Route = createFileRoute("/")({ component: SchemaPage });
