import { Sidebar } from "@/components/sidebar";

export default function LayoutAutenticado({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Sidebar>{children}</Sidebar>;
}
