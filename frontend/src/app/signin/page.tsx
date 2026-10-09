"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/lib/api-client";

const HOME = "/route53/v2/hostedzones";

const schema = z.object({
  email: z.string().min(1, "Enter your email address.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});
type FormValues = z.infer<typeof schema>;

export default function SignInPage() {
  const router = useRouter();
  const { user, login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  useEffect(() => {
    if (user) router.replace(HOME);
  }, [user, router]);

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setError(null);
    try {
      await login(email, password);
      router.replace(HOME);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? "Your authentication information is incorrect. Please try again."
          : e instanceof ApiError
            ? e.message
            : "Something went wrong. Please try again.",
      );
    }
  });

  return (
    <div style={{ minHeight: "100vh", background: "#f2f3f3" }}>
      <div style={{ background: "#232f3e", height: 56, display: "flex", alignItems: "center", padding: "0 20px" }}>
        <Image src="/aws-logo.svg" alt="AWS" width={60} height={36} priority />
      </div>

      <div style={{ maxWidth: 440, margin: "64px auto 0", padding: "0 16px" }}>
        <Container header={<Header variant="h1">Sign in</Header>}>
          <form onSubmit={onSubmit} noValidate>
            <Form
              actions={
                <Button variant="primary" formAction="submit" loading={isSubmitting}>
                  Sign in
                </Button>
              }
            >
              <SpaceBetween size="l">
                {error && (
                  <Alert type="error" header="Authentication failed">
                    {error}
                  </Alert>
                )}
                <FormField label="Email address" errorText={errors.email?.message}>
                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="email"
                        autoComplete="username"
                        autoFocus
                        value={field.value}
                        onChange={({ detail }) => field.onChange(detail.value)}
                        onBlur={field.onBlur}
                        invalid={!!errors.email}
                      />
                    )}
                  />
                </FormField>
                <FormField label="Password" errorText={errors.password?.message}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <Input
                        type="password"
                        autoComplete="current-password"
                        value={field.value}
                        onChange={({ detail }) => field.onChange(detail.value)}
                        onBlur={field.onBlur}
                        invalid={!!errors.password}
                      />
                    )}
                  />
                </FormField>
              </SpaceBetween>
            </Form>
          </form>
        </Container>
        <Box textAlign="center" color="text-body-secondary" fontSize="body-s" margin={{ top: "l" }}>
          Demo account: demo@example.com / demo1234
        </Box>
      </div>
    </div>
  );
}
