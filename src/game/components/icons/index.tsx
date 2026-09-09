import type { ReactElement } from "react";
import type { IconProps } from "./IconProps";
import { IndustrialFirewallIcon } from "./IndustrialFirewallIcon";
import { ManagedSwitchIcon } from "./ManagedSwitchIcon";
import { DataDiodeIcon } from "./DataDiodeIcon";
import { IndustrialDmzIcon } from "./IndustrialDmzIcon";
import { JumpHostIcon } from "./JumpHostIcon";
import { VpnGatewayIcon } from "./VpnGatewayIcon";
import { AuthServerIcon } from "./AuthServerIcon";
import { IdsIpsIcon } from "./IdsIpsIcon";
import { SiemIcon } from "./SiemIcon";
import { EndpointProtectionIcon } from "./EndpointProtectionIcon";
import { PatchServerIcon } from "./PatchServerIcon";
import { BackupRecoveryIcon } from "./BackupRecoveryIcon";
import { PkiCertificatesIcon } from "./PkiCertificatesIcon";
import { RedundantControlIcon } from "./RedundantControlIcon";
import { PhysicalAccessControlIcon } from "./PhysicalAccessControlIcon";
import { RemovableMediaControlIcon } from "./RemovableMediaControlIcon";

export type IconComponent = (props: IconProps) => ReactElement;

/** Komponent-id (fra components.json) → SVG-ikon. */
export const COMPONENT_ICONS: Record<string, IconComponent> = {
  "industrial-firewall": IndustrialFirewallIcon,
  "managed-switch": ManagedSwitchIcon,
  "data-diode": DataDiodeIcon,
  "industrial-dmz": IndustrialDmzIcon,
  "jump-host": JumpHostIcon,
  "vpn-gateway": VpnGatewayIcon,
  "auth-server": AuthServerIcon,
  "ids-ips": IdsIpsIcon,
  siem: SiemIcon,
  "endpoint-protection": EndpointProtectionIcon,
  "patch-server": PatchServerIcon,
  "backup-recovery": BackupRecoveryIcon,
  "pki-certificates": PkiCertificatesIcon,
  "redundant-control": RedundantControlIcon,
  "physical-access-control": PhysicalAccessControlIcon,
  "removable-media-control": RemovableMediaControlIcon,
};

export function ComponentIcon({ componentId, ...props }: IconProps & { componentId: string }) {
  const Icon = COMPONENT_ICONS[componentId];
  if (!Icon) return null;
  return <Icon {...props} />;
}

export * from "./IconProps";
