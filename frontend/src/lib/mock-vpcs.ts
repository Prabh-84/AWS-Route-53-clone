// Fake VPCs used only to populate the Region / VPC ID pickers. The backend does not validate them
// beyond their format (vpc-<8-17 hex chars>), so these are all well-formed.

export interface MockRegion {
  region: string;
  /** Console-style display name. */
  label: string;
}

export interface MockVpc {
  region: string;
  vpc_id: string;
  label: string;
}

export const MOCK_REGIONS: MockRegion[] = [
  { region: "us-east-1", label: "US East (N. Virginia)" },
  { region: "us-west-2", label: "US West (Oregon)" },
  { region: "eu-west-1", label: "Europe (Ireland)" },
  { region: "ap-south-1", label: "Asia Pacific (Mumbai)" },
];

export const MOCK_VPCS: MockVpc[] = [
  { region: "us-east-1", vpc_id: "vpc-0a1b2c3d4e5f6a7b8", label: "vpc-0a1b2c3d4e5f6a7b8 (default)" },
  { region: "us-east-1", vpc_id: "vpc-0b2c3d4e5f6a7b8c9", label: "vpc-0b2c3d4e5f6a7b8c9 (prod-network)" },
  { region: "us-east-1", vpc_id: "vpc-0c3d4e5f6a7b8c9d0", label: "vpc-0c3d4e5f6a7b8c9d0 (staging)" },
  { region: "us-west-2", vpc_id: "vpc-0d4e5f6a7b8c9d0e1", label: "vpc-0d4e5f6a7b8c9d0e1 (default)" },
  { region: "us-west-2", vpc_id: "vpc-0e5f6a7b8c9d0e1f2", label: "vpc-0e5f6a7b8c9d0e1f2 (data-platform)" },
  { region: "eu-west-1", vpc_id: "vpc-0f6a7b8c9d0e1f2a3", label: "vpc-0f6a7b8c9d0e1f2a3 (default)" },
  { region: "eu-west-1", vpc_id: "vpc-01a2b3c4d5e6f7a8b", label: "vpc-01a2b3c4d5e6f7a8b (eu-apps)" },
  { region: "eu-west-1", vpc_id: "vpc-02b3c4d5e6f7a8b9c", label: "vpc-02b3c4d5e6f7a8b9c (shared-services)" },
  { region: "ap-south-1", vpc_id: "vpc-03c4d5e6f7a8b9c0d", label: "vpc-03c4d5e6f7a8b9c0d (default)" },
  { region: "ap-south-1", vpc_id: "vpc-04d5e6f7a8b9c0d1e", label: "vpc-04d5e6f7a8b9c0d1e (analytics)" },
];

export const vpcsForRegion = (region: string): MockVpc[] => MOCK_VPCS.filter((vpc) => vpc.region === region);

export const regionLabel = (region: string): string => {
  const found = MOCK_REGIONS.find((r) => r.region === region);
  return found ? `${found.label} [${found.region}]` : region;
};
