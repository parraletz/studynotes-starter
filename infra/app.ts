#!/usr/bin/env node
import { App, Tags } from "aws-cdk-lib";
import { StudyNotesStack } from "./stack.js";

const app = new App();

const stack = new StudyNotesStack(app, "StudyNotes", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    // Lambda Web Functions no está en todas las regiones todavía; us-east-1 sí.
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  description: "StudyNotes starter: Lambda Web Functions + DynamoDB",
});

// Etiquetas para encontrar (y costear) todo lo del starter en Billing.
Tags.of(stack).add("project", "studynotes");
Tags.of(stack).add("managed-by", "cdk");
