import DesignLabShell from "./DesignLabShell";
import StudioV0 from "./StudioV0";
import { STUDIO_VIEWS } from "@/lib/design-lab";

export default function StudioPrototype({ view }: { view: string }) {
  const design = STUDIO_VIEWS.find((item) => item.id === view) ?? STUDIO_VIEWS[0];
  return <DesignLabShell surface="studio" view={design.id} source={design.source}>
    {design.id === "field" ? <StudioV0 embedded /> : null}
  </DesignLabShell>;
}
