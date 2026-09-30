import type { PortalLocation } from "@/lib/types";
import { titleCase } from "@/lib/format";

export default function LocationCard({ loc }: { loc: PortalLocation }) {
  return (
    <div className="card">
      <strong>{loc.name}</strong> <span className="badge">{titleCase(loc.locationType)}</span>
      <div className="muted">
        {loc.addressLine1}, {loc.city}, {loc.state} {loc.zip}
      </div>
      {loc.opensAt && loc.closesAt && (
        <div className="muted">
          {loc.opensAt.slice(0, 5)}–{loc.closesAt.slice(0, 5)} {loc.timeZone}
          {loc.phoneNumber && ` · ${loc.phoneNumber}`}
        </div>
      )}
      <div className="muted">{loc.services.map(titleCase).join(", ")}</div>
    </div>
  );
}
