"use client";

import { useState } from "react";
import { Controller, useFieldArray, useFormState, useWatch, type Control } from "react-hook-form";
import Alert from "@cloudscape-design/components/alert";
import Autosuggest from "@cloudscape-design/components/autosuggest";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { InfoLink } from "@/components/common/InfoLink";
import { MOCK_REGIONS, regionLabel, vpcsForRegion } from "@/lib/mock-vpcs";
import type { VpcValue } from "@/lib/zone-schema";

interface VpcFieldsProps<T extends { vpcs: VpcValue[] }> {
  control: Control<T>;
  /** Show the "VPC settings" info alert (the create form does; edit does too, it is dismissible). */
  showAlert?: boolean;
}

/** "VPCs to associate with the hosted zone" container: repeating Region / VPC ID rows. */
export function VpcFields<T extends { vpcs: VpcValue[] }>({ control: typedControl, showAlert = true }: VpcFieldsProps<T>) {
  // The field array only touches `vpcs`, so view the form through that narrower type.
  const control = typedControl as unknown as Control<{ vpcs: VpcValue[] }>;
  const { fields, append, remove, update } = useFieldArray({ control, name: "vpcs" });
  const rows = useWatch({ control, name: "vpcs" });
  const { errors } = useFormState({ control });
  const [alertVisible, setAlertVisible] = useState(showAlert);

  const listError = errors.vpcs?.message ?? errors.vpcs?.root?.message;

  return (
    <Container
      header={
        <Header
          variant="h2"
          info={<InfoLink />}
          description="To use this hosted zone to resolve DNS queries for one or more VPCs, choose the VPCs. To associate a VPC with a hosted zone when the VPC was created using a different AWS account, you must use a programmatic method, such as the AWS CLI."
        >
          VPCs to associate with the hosted zone
        </Header>
      }
    >
      <SpaceBetween size="l">
        {alertVisible && (
          <Alert type="info" dismissible dismissAriaLabel="Close alert" onDismiss={() => setAlertVisible(false)}>
            For each VPC that you associate with a private hosted zone, you must set the Amazon VPC settings{" "}
            <Link
              external
              href="https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns.html#vpc-dns-updating"
              externalIconAriaLabel="Opens in a new tab"
            >
              enableDnsHostnames and enableDnsSupport
            </Link>{" "}
            to true.
          </Alert>
        )}

        {fields.map((field, index) => {
          const region = rows?.[index]?.region ?? "";
          const rowErrors = errors.vpcs?.[index];
          return (
            <div key={field.id} style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px" }}>
                <FormField label="Region" info={<InfoLink />} errorText={rowErrors?.region?.message} stretch>
                  <Controller
                    control={control}
                    name={`vpcs.${index}.region`}
                    render={({ field: regionField }) => (
                      <Select
                        placeholder="Choose region"
                        ariaLabel="Region"
                        selectedOption={
                          regionField.value ? { value: regionField.value, label: regionLabel(regionField.value) } : null
                        }
                        options={MOCK_REGIONS.map((r) => ({ value: r.region, label: `${r.label} [${r.region}]` }))}
                        onChange={({ detail }) => {
                          // A VPC belongs to one region, so changing the region clears the VPC choice.
                          update(index, { region: detail.selectedOption.value ?? "", vpc_id: "" });
                        }}
                        invalid={!!rowErrors?.region}
                      />
                    )}
                  />
                </FormField>
              </div>
              <div style={{ flex: "1 1 260px" }}>
                <FormField label="VPC ID" info={<InfoLink />} errorText={rowErrors?.vpc_id?.message} stretch>
                  <Controller
                    control={control}
                    name={`vpcs.${index}.vpc_id`}
                    render={({ field: vpcField }) => (
                      <Autosuggest
                        placeholder="Choose VPC"
                        ariaLabel="VPC ID"
                        disabled={!region}
                        value={vpcField.value}
                        onChange={({ detail }) => vpcField.onChange(detail.value)}
                        onBlur={vpcField.onBlur}
                        options={vpcsForRegion(region).map((vpc) => ({ value: vpc.vpc_id, description: vpc.label }))}
                        enteredTextLabel={(value) => `Use: "${value}"`}
                        empty="No matches found"
                        statusType="finished"
                        invalid={!!rowErrors?.vpc_id}
                      />
                    )}
                  />
                </FormField>
              </div>
              <Button onClick={() => remove(index)}>Remove VPC</Button>
            </div>
          );
        })}

        {listError && (
          <Box color="text-status-error" fontSize="body-s">
            {listError}
          </Box>
        )}

        <Button onClick={() => append({ region: "", vpc_id: "" })}>Add VPC</Button>
      </SpaceBetween>
    </Container>
  );
}
