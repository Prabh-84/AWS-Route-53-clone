import { z } from "zod";

// Mirrors backend/app/schemas/hosted_zone.py so the form rejects what the API would reject.
const LABEL = /^(?!-)[a-zA-Z0-9_-]{1,63}(?<!-)$/;
const VPC_ID = /^vpc-[0-9a-f]{8,17}$/;

export function isValidDomainName(value: string): boolean {
  const name = value.trim().replace(/\.$/, "");
  return name.length > 0 && name.length <= 253 && name.split(".").every((label) => LABEL.test(label));
}

export const vpcSchema = z.object({
  region: z.string().min(1, "Choose a region."),
  vpc_id: z
    .string()
    .min(1, "Choose a VPC.")
    .regex(VPC_ID, "Enter a valid VPC ID, such as vpc-0a1b2c3d4e5f6a7b8."),
});

const comment = z.string().max(256, "The description can have up to 256 characters.");
const NEEDS_VPC = "A private hosted zone must be associated with at least one VPC.";

export const createZoneSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Domain name is required.")
      .refine(isValidDomainName, "Domain name is not valid. Use letters, numbers, hyphens and underscores, separated by dots."),
    comment,
    type: z.enum(["PUBLIC", "PRIVATE"]),
    vpcs: z.array(vpcSchema),
  })
  .superRefine((value, ctx) => {
    if (value.type === "PRIVATE" && value.vpcs.length === 0) {
      ctx.addIssue({ code: "custom", path: ["vpcs"], message: NEEDS_VPC });
    }
  });

export type CreateZoneValues = z.infer<typeof createZoneSchema>;

export function editZoneSchema(isPrivate: boolean) {
  return z
    .object({ comment, vpcs: z.array(vpcSchema) })
    .superRefine((value, ctx) => {
      if (isPrivate && value.vpcs.length === 0) {
        ctx.addIssue({ code: "custom", path: ["vpcs"], message: NEEDS_VPC });
      }
    });
}

export type EditZoneValues = z.infer<ReturnType<typeof editZoneSchema>>;
export type VpcValue = z.infer<typeof vpcSchema>;
