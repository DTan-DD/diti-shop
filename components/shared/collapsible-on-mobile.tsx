"use client";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import useDeviceType from "@/hooks/use-device-type";
import { Button } from "../ui/button";

// Có sửa lỗi
export default function CollapsibleOnMobile({ title, children }: { title: string; children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const deviceType = useDeviceType();
  const [open, setOpen] = useState(false);

  // ✅ Không theo dõi searchParams, chỉ deviceType
  useEffect(() => {
    const timeout = setTimeout(() => {
      setOpen(deviceType === "desktop");
    }, 0);
    return () => clearTimeout(timeout);
  }, [deviceType, searchParams]);

  if (deviceType === "unknown") return null;

  return (
    <Collapsible open={open}>
      <CollapsibleTrigger asChild>
        {deviceType === "mobile" && (
          <Button onClick={() => setOpen(!open)} variant="outline" className="w-full">
            {title}
          </Button>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}
