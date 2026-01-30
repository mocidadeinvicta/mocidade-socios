import SocioFichaClient from "./SocioFichaClient";

export default async function SocioFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SocioFichaClient id={id} />;
}
