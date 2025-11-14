// lib/email-renderer.ts
import { render } from "@react-email/render";
import React from "react";

export const renderEmailComponent = async (component: React.ReactElement) => {
  return await render(component);
};
