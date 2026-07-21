import DesignLabShell from "./DesignLabShell";
import DunaversityView from "./DunaversityView";
import { LIVE_VIEWS } from "@/lib/design-lab";

export default function LivePrototype({ view }: { view: string }) {
  const design = LIVE_VIEWS.find((item) => item.id === view) ?? LIVE_VIEWS[0];
  return <DesignLabShell surface="live" view={design.id}>
    <DunaversityView surface="live" view={design.id} />
  </DesignLabShell>;
}
