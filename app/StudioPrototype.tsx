import DesignLabShell from "./DesignLabShell";
import DunaversityView from "./DunaversityView";
import { STUDIO_VIEWS } from "@/lib/design-lab";

export default function StudioPrototype({ view }: { view: string }) {
  const design = STUDIO_VIEWS.find((item) => item.id === view) ?? STUDIO_VIEWS[0];
  return <DesignLabShell surface="studio" view={design.id}>
    <DunaversityView surface="studio" view={design.id} />
  </DesignLabShell>;
}
