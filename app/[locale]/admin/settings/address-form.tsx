"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { Loader2 } from "lucide-react";

export default function AddressForm({ id }: { id: string }) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [version, setVersion] = useState<string>("Loading...");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  // 🧠 Fetch version khi load form
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const { data } = await axios.get("/api/address/version");
        setVersion(data.version);
      } catch (error) {
        console.error(error);
        setVersion("Unknown");
      }
    };
    fetchVersion();
  }, []);

  // 📁 Chọn file JSON
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  // 🚀 Import JSON
  const handleImport = async () => {
    if (!file) {
      toast({ title: "Vui lòng chọn file JSON trước.", variant: "destructive" });
      return;
    }

    setImporting(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const provinces = Array.isArray(json) ? json : json.provinces;

      await axios.post("/api/address/import", { provinces });
      toast({ title: "Import thành công 🎉", description: "Dữ liệu địa chỉ đã được cập nhật." });

      const { data } = await axios.get("/api/address/version");
      setVersion(data.version);
      setFile(null);
      //   eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Import thất bại ❌",
        description: error?.response?.data?.error || error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle>Địa chỉ hành chính (Provinces / Districts / Wards)</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <FormItem>
            <FormLabel>Phiên bản dữ liệu hiện tại</FormLabel>
            <FormControl>
              <Input value={version} disabled className="max-w-xs" />
            </FormControl>
            <FormMessage />
          </FormItem>

          <FormItem>
            <FormLabel>Tải file JSON dữ liệu địa chỉ</FormLabel>
            <FormControl>
              <Input type="file" accept="application/json" onChange={handleFileChange} disabled={importing} className="max-w-sm" />
            </FormControl>
          </FormItem>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" onClick={handleImport} disabled={!file || importing}>
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang import...
              </>
            ) : (
              "Import dữ liệu"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              setLoading(true);
              const { data } = await axios.get("/api/address/version");
              setVersion(data.version);
              toast({ title: "Đã làm mới version ✅" });
              setLoading(false);
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Làm mới
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
