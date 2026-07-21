import DesignLabShell from "./DesignLabShell";
import { OUTSIDE_VIEWS } from "@/lib/design-lab";

export default function OutsidePrototype({ view }: { view: string }) {
  const design = OUTSIDE_VIEWS.find((item) => item.id === view) ?? OUTSIDE_VIEWS[0];
  return <DesignLabShell surface="outside" view={design.id} source={design.source} />;
}
